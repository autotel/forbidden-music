// @ts-check
//@ts-ignore
const samplingRate = sampleRate || 44100;
//@ts-ignore
if (!sampleRate) console.warn("sampleRate is not defined. Using 44100 instead.");

class SampleBySampleOperator {
    operation = (inSample) => inSample;
}


class Voice {
    getBlock(size) { }
    trigger({ freq, amp }) { }
    stealTrigger = (p) => this.trigger(p);
    stop() { }
    isBusy = false;
}

class DelayLine extends SampleBySampleOperator {

    delaySamples = 400;
    feedback = 0.99;

    /** @type {SampleBySampleOperator|null} */
    sidechainEffect = null;
    /** @type {Array<Number>}*/
    memory = [];

    operation = (insample) => {
        let ret = 0;

        if (this.memory.length > this.delaySamples) {
            ret += this.memory.shift() || 0;
        }
        if (this.memory.length > this.delaySamples) {
            this.memory.splice(0, this.memory.length - this.delaySamples);
        }
        ret += insample;

        if (this.sidechainEffect) {
            ret = this.sidechainEffect.operation(ret);
        }

        this.memory.push(ret * this.feedback);
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
    noiseDecayInverse = 16 / samplingRate;
    delayLine = new DelayLine();
    trig({ freq, amp }) {
        this.envVal = amp;
        this.delayLine.delaySamples = samplingRate / freq;
        this.isBusy = true;
    }
    stop() {
        this.envVal = 0;
        this.isBusy = false;
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
                this.envVal -= this.noiseDecayInverse;
            }
        }
        return output;
    }
}



class Karplus2Voice extends Voice {
    envVal = 0;
    noiseDecayInverse = 16 / samplingRate;

    delayLine1 = new DelayLine();
    delayLine2 = new DelayLine();
    delayLine3 = new DelayLine();

    constructor() {
        super();
        // define the characteristics of the synth timbre.
        const impulseDecay = 1 / 32; //seconds
        this.noiseDecayInverse = 1 / (samplingRate * impulseDecay);
        // play with these; but not recommended to go out of the -1 to 1 range.
        this.delayLine1.feedback = -0.999;
        this.delayLine2.feedback = -0.98;
        this.delayLine3.feedback = 0.3;
        // play with the filter types and "k" values. You could also go and edit the filters themselves.
        this.delayLine1.sidechainEffect = new IIRFilter({ k: 0.1 });
        // this.delayLine3.sidechainEffect = new IIRFilter1();

    }

    trig({ freq, amp }) {
        this.envVal = amp;
        // const splfq = samplingRate / freq;
        this.delayLine1.delaySamples = samplingRate / freq;
        this.delayLine2.delaySamples = 2 * samplingRate / freq;
        this.delayLine3.delaySamples = 4 * samplingRate / freq;
        this.isBusy = true;
    }
    stop() {
        this.envVal = 0;
        this.isBusy = false;
    }
    /** @param {number} blockSize*/
    getBlock(blockSize) {
        const output = new Float32Array(blockSize);

        for (let splN = 0; splN < blockSize; splN++) {
            let sampleNow = (Math.random() - 0.5) * this.envVal;
            sampleNow += this.delayLine1.operation(sampleNow);
            sampleNow += this.delayLine2.operation(sampleNow) / 2;
            sampleNow += this.delayLine3.operation(sampleNow) / 2;
            output[splN] = sampleNow;
            if (this.envVal <= 0) {
                this.envVal = 0;
                this.isBusy = false;
            } else {
                this.envVal -= this.noiseDecayInverse;
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

//@ts-ignore
registerProcessor('karplus', class extends AudioWorkletProcessor {
    constructor() {
        super();
        /** @type {Array<Karplus2Voice>} */
        this.activeVoices = [];
        this.samples = [];
        this.totalSamples = 0;
        // @ts-ignore
        this.port.onmessage = ({ data }) => {
            console.log(data);
            if (data.stopAll) {
                Object.keys(this.activeVoices).map((key) => {
                    this.activeVoices[key].stop();
                    delete this.activeVoices[key];
                });
            } else if (data.stop) {
                if (this.activeVoices[data.stop]) {
                    this.activeVoices[data.stop].stop();
                    delete this.activeVoices[data.stop];
                } else {
                    console.warn("no voice " + data.stop + " to stop");
                }
            } else {
                const freq = data.freq;
                const tVoice = this.policarpo.getVoice();
                if (data.ref) {
                    this.activeVoices[data.ref] = tVoice;
                }
                tVoice.trig({ freq, amp: data.amp || 1 });
            }
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