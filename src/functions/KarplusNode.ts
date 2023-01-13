// based on https://github.com/g200kg/audioworklet-adsrnode

export default class KarplusNode extends AudioWorkletNode {
  trigger: (freq: number, amp: number) => void;

  constructor(actx: AudioContext) {
    if (KarplusNode.initd === false) {
      KarplusNode.Initialize(actx);
    }

    super(actx, 'karplus', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      channelCount: 1,
    });

    this.trigger = (freq, amp) => {
      this.port.postMessage({
        freq, amp
      });
    }

  }
  static initd = false;
  static Initialize(actx: AudioContext) {

    const karplusProc = `
      const samplingRate = sampleRate || 44100;
      
      if(!sampleRate) console.warn("sampleRate is not defined. Using 44100 instead.");

      class SampleBySampleOperator {
          operation = (inSample) => inSample;
      }
  
  
      class Voice {
          getBlock(size) { }
          trigger({ freq, amp }) { }
          stealTrigger = (p) => this.trigger(p);
          isBusy = false;
      }
  
      class DelayLine extends SampleBySampleOperator {
          /** @type {Array<Number>}*/
          memory = [];
          delaySamples = 400;
          feedback = 0.99;
  
          /** @type {SampleBySampleOperator|null} */
          sidechainEffect = null;
  
          operation = (insample) => {
              let ret = 0;
  
              while (this.memory.length > this.delaySamples) {
                  ret += this.memory.pop();
              }
  
              ret += insample;
  
              if (this.sidechainEffect) {
                  ret = this.sidechainEffect.operation(ret);
              }
  
              this.memory.unshift(ret * this.feedback);
              return ret;
          }
      }
  
      class IIRFilter extends SampleBySampleOperator {
          /** @type {Number}*/
          memory = 0;
          k = 0.01;
          amp = 0.99;
          operation = (insample) => {
              let ret = 0;
              let ik = 1 - this.k;
              ret = insample * ik;
              ret += this.memory * this.k;
              ret *= this.amp;
  
              this.memory = ret;
              return ret;
          }
          constructor(props = {}) {
              super();
              Object.assign(this, props);
          }
      }
  
      class IIRFilter1 extends SampleBySampleOperator {
          /** @type {Array<Number>}*/
          memory = [0, 0, 0];
          amp = 0.99;
          operation = (insample) => {
              let ret = 0;
  
              ret = insample * 0.01;
              ret += this.memory[0] * 0.2;
              ret += this.memory[1] * 0.3;
              ret += this.memory[2] * 0.49;
              ret *= this.amp;
  
              this.memory.pop();
              this.memory.unshift(ret);
  
              return ret;
          }
      }
  
      class KarplusVoice extends Voice {
          envVal = 0;
          decayInverse = 16 / samplingRate;
          delayLine = new DelayLine();
          trig({ freq, amp }) {
              this.envVal = amp;
              this.delayLine.delaySamples = samplingRate / freq;
              this.isBusy = true;
          }
          /** @param {number} blockSize*/
          getBlock(blockSize) {
              const output = new Float32Array(blockSize);
  
              for (let splN = 0; splN < blockSize; splN++) {
                  let sampleNow = (Math.random() - 0.5) * this.envVal;
                  sampleNow += this.delayLine.operation(sampleNow);
                  output[splN] = sampleNow;
                  if (this.envVal < 0) {
                      this.envVal = 0;
                  } else {
                      this.envVal -= this.decayInverse;
                  }
              }
              return output;
          }
      }
  
  
  
      class Karplus2Voice extends Voice {
          envVal = 0;
          decayInverse = 32 / samplingRate;
  
          delayLine1 = new DelayLine();
          delayLine2 = new DelayLine();
          delayLine3 = new DelayLine();
  
          constructor() {
              super();
              // define the characteristics of the synth timbre.
              const impulseDecay = 1/32; //seconds
              this.decayInverse = 1 / (samplingRate * impulseDecay);
              // play with these; but not recommended to go out of the -1 to 1 range.
              this.delayLine1.feedback = -0.99;
              this.delayLine2.feedback = 0.99;
              this.delayLine3.feedback = 0.99;
              // play with the filter types and "k" values. You could also go and edit the filters themselves.
              this.delayLine1.sidechainEffect = new IIRFilter({ k: 0.01 });
              this.delayLine2.sidechainEffect = new IIRFilter({ k: 0.01 });
              this.delayLine3.sidechainEffect = new IIRFilter1();
  
          }
  
          trig({ freq, amp }) {
              this.envVal = amp;
              const splfq = samplingRate / freq;
              this.delayLine1.delaySamples = samplingRate / freq;
              this.delayLine2.delaySamples = 2 * samplingRate / freq;
              this.delayLine3.delaySamples = 4 * samplingRate / freq;
              this.isBusy = true;
          }
          /** @param {number} blockSize*/
          getBlock(blockSize) {
              const output = new Float32Array(blockSize);
  
              for (let splN = 0; splN < blockSize; splN++) {
                  let sampleNow = (Math.random() - 0.5) * this.envVal;
                  sampleNow += this.delayLine1.operation(sampleNow) / 2;
                  sampleNow += this.delayLine2.operation(sampleNow) / 2;
                  sampleNow += this.delayLine3.operation(sampleNow) / 2;
                  output[splN] = sampleNow;
                  if (this.envVal < 0) {
                      this.envVal = 0;
                  } else {
                      this.envVal -= this.decayInverse;
                  }
              }
              return output;
          }
      }
  
      class PolyManager {
          maxVoices = 32;
          /** @type {Array<Voice>} */
          list = [];
          lastStolenVoice = 0;
          /** @type {ObjectConstructor} VoiceConstructor */
          constructor(VoiceConstructor) {
              this.getVoice = () => {
                  let found = null;
                  this.list.forEach(voice => {
                      if (!voice.isBusy) {
                          found = voice;
                      }
                  });
                  if (!found) {
                      if (this.list.length > this.maxVoices) {
                          found = this.list[this.lastStolenVoice];
                          this.lastStolenVoice += 1;
                          this.lastStolenVoice %= this.maxVoices;
                      } else {
                          found = new VoiceConstructor();
                          this.list.push(found);
                      }
                  }
                  return found;
              }
          }
      }
  
      registerProcessor('karplus', class extends AudioWorkletProcessor {
          constructor() {
              super();
  
              this.samples = [];
              this.totalSamples = 0;
  
              this.port.onmessage = ({ data }) => {
                  console.log(data);
  
                  const freq = data.freq;
                  const tVoice = this.policarpo.getVoice();
                  tVoice.trig({ freq, amp: data.amp || 1 });
              };
          }
  
          policarpo = new PolyManager(Karplus2Voice);
  
          process(inputs, outputs, parameters) {
              const output = outputs[0];
              const blockSize = outputs[0][0].length;
              const mix = new Float32Array(blockSize);
              this.policarpo.list.forEach((voice) => {
                  const voiceResults = voice.getBlock(blockSize);
                  for (let sampleN = 0; sampleN < blockSize; sampleN++) {
                      mix[sampleN] += voiceResults[sampleN] / 10;
                  }
              });
  
              output.forEach(
                  /**
                   * @param {Float32Array} channel
                   * @param {number} channelN
                   */
                  (channel, channelN) => {
                      channel.set(mix)
                  }
              )
              return true
          }
      });
  
      `;
    KarplusNode.initd = true;
    return actx.audioWorklet.addModule('data:text/javascript,' + encodeURI(karplusProc));
  }
}
