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
    /** @type {Array<Number>}*/
    memory = [];

    /**
     * @param {Number} insample
     * @param {null | function} sidechain
     * */
    operation = (insample, sidechain = null) => {
        let ret = 0;

        if (this.memory.length > this.delaySamples) {
            ret += this.memory.shift() || 0;
        }
        if (this.memory.length > this.delaySamples) {
            this.memory.splice(0, this.memory.length - this.delaySamples);
        }
        ret += insample;

        if (sidechain) {
            ret = sidechain(ret);
        }

        this.memory.push(ret * this.feedback);
        return ret;
    }
    operationNoTime = (insample) => {
        let ret = 0;

        ret += this.memory[0] || 0;
        ret += insample;


        // if (this.sidechainEffect) {
        //     ret = this.sidechainEffect.operation(ret);
        // }

        this.memory[0] += ret * this.feedback;
        return ret;

    }
    reset = () => {
        this.memory = [];
    }
}

class IIRFilter extends SampleBySampleOperator {
    /** @type {Number}*/




    constructor(props = {}) {
        super();

        let { memory, k, amp } = Object.assign(props, {
            memory: 0,
            k: 0.01,
            amp: 0.99,
        });
        let ik = 1 - k;

        this.set = (props) => {
            if(props.memory) this.memory = props.memory;
            if(props.k) this.k = props.k;
            if(props.amp) this.amp = props.amp;
            ik = 1 - this.k;
        }

        this.operation = (insample) => {
            let ret = 0;
            ret = insample * ik;
            ret += memory * k;
            ret *= amp;

            memory = ret;
            return ret;
        }
    }
}

class DCRemover extends SampleBySampleOperator {
    /** @type {Number}*/
    memory = 0;
    operation = (insample) => {
        let ret = 0;
        ret = insample - this.memory;
        this.memory = insample * 0.01 + this.memory * 0.99;
        return ret;
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

class IIRLPFRochars extends SampleBySampleOperator {
    // based on https://github.com/rochars/low-pass-filter/blob/master/index.js
    /*
    * Copyright (c) 2018-2019 Rafael da Silva Rocha.
    * Copyright (c) 2011 James Robert, http://jiaaro.com
    *
    * Permission is hereby granted, free of charge, to any person obtaining
    * a copy of this software and associated documentation files (the
    * "Software"), to deal in the Software without restriction, including
    * without limitation the rights to use, copy, modify, merge, publish,
    * distribute, sublicense, and/or sell copies of the Software, and to
    * permit persons to whom the Software is furnished to do so, subject to
    * the following conditions:
    *
    * The above copyright notice and this permission notice shall be
    * included in all copies or substantial portions of the Software.
    *
    * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
    * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
    * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    */
    /** @type {Number} */
    rc;
    /** @type {Number} */
    dt;
    /** @type {Number} */
    alpha;
    /** @type {Number} */
    last_val = 0;
    /** @type {Number} */
    offset;
    constructor(cutoff) {
        super();
        this.setCutoff(cutoff);
    }
    setCutoff(cutoff) {
        this.rc = 1.0 / (cutoff * 2 * Math.PI);
        this.dt = 1.0 / samplingRate;
        this.alpha = this.dt / (this.rc + this.dt);
    }
    operation = (insample) => {
        this.offset++;
        this.last_val = this.last_val
            + (this.alpha * (insample - this.last_val));
        return this.last_val;
    }
}
class IIRBPFRochars extends SampleBySampleOperator {
    /** @type {IIRLPFRochars} */
    lp;
    /** @type {IIRLPFRochars} */
    hp;
    constructor(hpFreq, lpFreq) {
        super();
        this.lp = new IIRLPFRochars(lpFreq);
        this.hp = new IIRLPFRochars(hpFreq);
    }
    setFreqs(hpFreq, lpFreq) {
        this.lp.setCutoff(lpFreq);
        this.hp.setCutoff(hpFreq);
    }
    operation = (inSample) => {
        const hiPassed = inSample - this.hp.operation(inSample);
        return this.lp.operation(hiPassed);
    }
}
/**
 * bfilt - High-order Butterworth filter.
by Andy Allinger, 2021, released to the public domain

   Permission  to  use, copy, modify, and distribute this software and
   its documentation  for  any  purpose  and  without  fee  is  hereby
   granted,  without any conditions or restrictions.  This software is
   provided "as is" without express or implied warranty.

Refer to:

    "Cookbook formulae for audio EQ biquad filter coefficients"
    Robert Bristow-Johnson, [2005]

    "The Butterworth Low-Pass Filter"
    John Stensby, 19 Oct 2005

The Butterworth poles lie on a circle.  The product of the qualities
is 2^(-1/2).
*/
class Butterworth1 extends SampleBySampleOperator {
    /**
     *    @param {number} fpass Pass frequency, cycles per second
     *    @param {number} fstop Stop frequency, cycles per second
     *    @param {number} hpass Minimum passband transmission, fraction 0...1
     *    @param {number} hstop Maximum stopband transmission, fraction 0...1
    */
    constructor(fpass, fstop, hpass, hstop) {
        super();
        let x = 0;
        let x1 = 0;
        let x2 = 0;
        let y = 0;
        let y1 = 0;
        let y2 = 0;
        let a0, a1, a2, b1, b2;
        this.set = (fpass, fstop, hpass, hstop) => {
            if (!fpass || !fstop || !hpass || !hstop) throw new Error('fpass, fstop, hpass and hstop are required. got ' + fpass + ' ' + fstop + ' ' + hpass + ' ' + hstop);
            if (fpass <= 0 || fpass >= 0.5 * samplingRate) throw new Error('fpass must be between 0 and 0.5 * samplingRate, got ' + fpass);
            if (fstop <= 0 || fstop >= 0.5 * samplingRate) throw new Error('fstop must be between 0 and 0.5 * samplingRate, got ' + fstop);
            if (hpass <= 0 || hpass >= 1) throw new Error('hpass must be between 0 and 1, got ' + hpass);
            if (hstop <= 0 || hstop >= 1) throw new Error('hstop must be between 0 and 1, got ' + hstop);
            if (fpass === fstop) throw new Error('fpass and fstop must be different, got ' + fpass);
            const isLowpass = fpass < fstop;
            const d = 1 / hstop;
            const e = Math.sqrt(1 / (hpass * hpass) - 1);
            let n = Math.floor(Math.abs(Math.log(e / Math.sqrt(d * d - 1)) / Math.log(fpass / fstop))) + 1;
            if (n % 2) ++n;
            const o = isLowpass ? -1 / n : 1 / n;
            const fcut = fstop * Math.pow(Math.sqrt(d * d - 1), o);
            const w0 = Math.PI * 2 * fcut / samplingRate;
            const c = Math.cos(w0);
            for (let k = Math.floor(n / 2); k >= 1; --k) {
                const q = -0.5 / Math.cos(Math.PI * (2 * k + n - 1) / (2 * n));
                const r = Math.sin(w0) / (2 * q);
                if (isLowpass) {
                    a1 = (1 - c) / (1 + r);
                    a0 = 0.5 * a1;
                } else {
                    a1 = -(1 + c) / (1 + r);
                    a0 = -0.5 * a1;
                }
                a2 = a0;
                b1 = -2 * c / (1 + r);
                b2 = (1 - r) / (1 + r);

            }
            return 0;
        }

        this.set(fpass, fstop, hpass, hstop);
        this.ll = 1000;
        this.operation = (input) => {
            x2 = x1;
            x1 = x;
            x = input;
            y2 = y1;
            y1 = y;
            y = a0 * x + a1 * x1 + a2 * x2 - b1 * y1 - b2 * y2;
            return y;
        }
    }
}
class ButterworthLpf1 extends SampleBySampleOperator {
    constructor(cutoffFreq = 500, gain = 1, sharpness = 1.2) {
        super();

        const hpass = 0.95;
        const hstop = 0.05;
        /** @type {Butterworth1} */
        let b;
        this.set = (cutoffFreq = 500, gain = 1, sharpness = 8) => {
            const fpass = cutoffFreq;
            const fstop = cutoffFreq - cutoffFreq / sharpness;
            console.log("setf", fpass, fstop)
            if (!b) {
                b = new Butterworth1(fpass, fstop, hpass, hstop);
            } else {
                b.set(fpass, fstop, hpass, hstop);
            }
            this.operation = (input) => {
                return b.operation(input * gain);
            }
        }
        this.operation = (input) => 0;
        this.set(cutoffFreq, gain, sharpness);
    }
}
class ButterworthHpf1 extends SampleBySampleOperator {
    constructor(cutoffFreq = 1, gain = 1, sharpness = 1.2) {
        super();

        const hpass = 0.95;
        const hstop = 0.05;
        /** @type {Butterworth1} */
        let b;
        this.set = (cutoffFreq = 500, gain = 1, sharpness = 1.2) => {
            const fpass = cutoffFreq;
            const fstop = cutoffFreq - cutoffFreq / sharpness;
            if (!b) {
                b = new Butterworth1(fpass, fstop, hpass, hstop);
            } else {
                b.set(fpass, fstop, hpass, hstop);
            }
            this.operation = (input) => {
                return b.operation(input * gain);
            }
        }
        this.operation = (input) => 0;
        this.set(cutoffFreq, gain, sharpness);
    }
}

class ButterworthBpf1 extends SampleBySampleOperator {
    constructor(hpFreq = 1, lpFreq = 500) {
        const hp = new ButterworthHpf1(hpFreq);
        const lp = new ButterworthLpf1(lpFreq);
        super();
        this.operation = (input) => {
            return lp.operation(hp.operation(input));
        }
        this.setFreqs = (hpFreq, lpFreq) => {
            hp.set(hpFreq);
            lp.set(lpFreq);
        }
    }
}

class LpMoog extends SampleBySampleOperator {
    constructor(frequency, reso) {
        super();
        let msgcount = 0;
        let in1, in2, in3, in4, out1, out2, out3, out4
        in1 = in2 = in3 = in4 = out1 = out2 = out3 = out4 = 0.0;

        this.reset = () => {
            in1 = in2 = in3 = in4 = out1 = out2 = out3 = out4 = 0.0;
            msgcount = 0;
        }
        let f, af, sqf, fb;
        this.set = (frequency, reso) => {
            this.reset();
            if (frequency < 0) frequency = 0;
            f = (frequency / samplingRate) * Math.PI * 2 // probably bogus, origially was * 1.16 but was not working well

            af = 1 - f;
            sqf = f * f;

            fb = reso * (1.0 - 0.15 * sqf);
        }

        this.operation = (sample, saturate = false) => {

            let outSample = 0;
            sample -= out4 * fb;
            sample *= 0.35013 * (sqf) * (sqf);

            out1 = sample + 0.3 * in1 + af * out1; // Pole 1
            in1 = sample;
            out2 = out1 + 0.3 * in2 + af * out2; // Pole 2
            in2 = out1;
            out3 = out2 + 0.3 * in3 + af * out3; // Pole 3
            in3 = out2;
            out4 = out3 + 0.3 * in4 + af * out4; // Pole 4
            in4 = out3;

            outSample = out4;

            return saturate ? clip(outSample) : outSample;
        }
        this.set(frequency, reso);
    }
}


const clip = (val) => {
    if (val > 1) return 1;
    if (val < -1) return -1;
    return val;
}
const e = Math.E;
const applyHardnessCurve = (val) => {
    return e ^ (-val) * (e ^ val) - 1;
}
const applySigmoidRange = (input, alpha = 2.5) => {
    return 2 / (1 + Math.pow(e, -alpha * input)) - 1;
}
class Karplus2Voice extends Voice {
    noiseEnvVal = 0;
    noiseDecayInverse = 0;
    splsLeft = 0;
    bleed = 0;
    engaged = false;

    delayLine1 = new DelayLine();

    filter1 = new LpMoog(100, 0.9);
    dcRemover = new DCRemover();

    /** @type {Array<Karplus2Voice>} */
    otherVoices = [];

    constructor(voicesPool = []) {
        super();
        // define the characteristics of the synth timbre.
        const impulseDecay = 0.4; //seconds
        this.noiseDecayInverse = 1 / (samplingRate * impulseDecay);
        // play with these; but not recommended to go out of the -1 to 1 range.
        this.delayLine1.feedback = -0.999;
        // so that it's possible to "leak" sound accross voices
        this.otherVoices = voicesPool;

    }

    trig({ freq, amp, dur }) {
        this.noiseEnvVal = amp;
        // const splfq = samplingRate / freq;
        this.delayLine1.delaySamples = samplingRate / freq;

        this.isBusy = true;
        this.engaged = true;
        this.splsLeft = dur * samplingRate;
        // it seems this doing barely anyhting to the high end
        // this.filter1.setFreqs(1, 900);
        this.filter1.set(freq * 16, 0.01);
        this.filter1.reset();
        this.delayLine1.reset();
        this.dcRemover.memory = 0;
    }
    stop() {
        this.noiseEnvVal = 0;
        this.isBusy = false;
        this.engaged = false;
        this.splsLeft = 0;
    }
    /** 
     * @param {number} blockSize *
     * @returns {Float32Array} 
     */
    getBlock(blockSize) {
        const output = new Float32Array(blockSize);
        if (!this.engaged) return output;
        for (let splN = 0; splN < blockSize; splN++) {


            let sampleNow = (Math.random() - 0.5) * this.noiseEnvVal;
            // let sampleNow = (Math.random() - 0.5);

            sampleNow += this.delayLine1.operation(sampleNow, (s) => {
                const lpFiltered = this.filter1.operation(s);
                const dcRemoved = this.dcRemover.operation(lpFiltered);
                return dcRemoved;
            });
            // sampleNow += this.delayLine2.operation(sampleNow);
            // sampleNow += this.delayLine3.operation(sampleNow);

            sampleNow = clip(sampleNow);
            // bleed
            if (this.bleed) this.otherVoices.forEach(voice => {
                if (voice.engaged && voice !== this) {
                    voice.delayLine1.operationNoTime(sampleNow * this.bleed);
                    // voice.delayLine2.operationNoTime(sampleNow * this.bleed);
                    // voice.delayLine3.operationNoTime(sampleNow * this.bleed);
                }
            });
            // this.delayLine1.delaySamples += Math.round(sampleNow * 3);

            output[splN] = clip(sampleNow);
            if (this.noiseEnvVal <= 0) {
                this.noiseEnvVal = 0;
            } else {
                this.noiseEnvVal -= this.noiseDecayInverse;
            }
        }
        this.splsLeft -= blockSize;
        if (this.splsLeft <= 0) {
            this.stop();
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
                    console.log('use existing voice', this.list.indexOf(voice));
                }
            });
            if (!found) {
                if (this.list.length > this.maxVoices) {
                    found = this.list[this.lastStolenVoice];
                    this.lastStolenVoice += 1;
                    this.lastStolenVoice %= this.maxVoices;
                } else {
                    found = new VoiceConstructor(this.list);
                    this.list.push(found);
                    console.log('new voice', this.list.length);
                }
            }
            return found;
        }
    }
}
/**
    interface KarplusStopVoiceMessage {
        stop: true;
        ref: string;
    }

    interface KarplusStopAllMessage {
        stopall: true;
    }

    interface KarplusStartVoiceMessage {
        freq: number;
        amp: number;
        duration?: number;
        ref: string;
    }

*/
// TODO: stop when not in use, somehow.
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
            if (data.stopall) {
                this.policarpo.list.forEach(voice => voice.stop());
            }
            if (data.stop) {
                if (this.activeVoices[data.stop]) {
                    this.activeVoices[data.stop].stop();
                    delete this.activeVoices[data.stop];
                } else {
                    console.warn("no voice " + data.stop + " to stop");
                }
            }
            if (data.freq) {
                const freq = data.freq;
                const dur = data.duration || 1;
                const amp = data.amp || 1;
                const tVoice = this.policarpo.getVoice();
                if (data.ref) {
                    this.activeVoices[data.ref] = tVoice;
                }
                tVoice.trig({ freq, amp, dur });
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