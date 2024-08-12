// @ts-check
//@ts-ignore
const samplingRate = sampleRate || 44100;
const timeIncrementOfSample = 1 / samplingRate;
//@ts-ignore
if (!sampleRate) console.warn("sampleRate is not defined. Using 44100 instead.");

const liveParameters = {
    filter_k: 0.6,
    filter_wet: 0.5,
    exciter_level: 0.6,
    exciter_att: 0.3,
    exciter_decay: 1,
    cross_feedback: 0,
    level_to_feedback: -1,
    exciter_detuning: 0,
    amp_detuning: 0,
}

class SampleBySampleOperator {
    /**
     * @param {number} inSample
     */
    operation = (inSample) => inSample;
}

class Voice {
    /**
     * @param {number} size
     * @param {Object} params
     * @param {Float32Array} input
     */
    getBlock(size, params, input) { }
    /**
     * @param {Object} trigSettings
     */
    trig(trigSettings) { };
    stealTrigger = (p) => this.trig(p);
    stop() { }
    isBusy = false;
}
class Noise extends SampleBySampleOperator {
    operation = () => {
        // TODO: use fast, less precise random
        return Math.random() * 2 - 1
    }
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
class LpBoxcar extends SampleBySampleOperator {
    /** @type {number} */
    k
    /** 
     * @param {number} k
     */
    constructor(k) {
        super();
        this.k = k;
        let mem = 0;
        /** 
         * @param {number} x
         * @returns {number}
         */
        this.operation = (x) => {
            mem = this.k * x + (1 - this.k) * mem;
            return mem;
        }
        this.reset = () => {
            mem = 0;
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
        this.dt = timeIncrementOfSample;
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

class Lerper {
    increments = 0;
    life = 0;
    val = 0;
    set(start, target, life) {
        // edge case

        this.increments = (target - start) / life
        this.val = start;
        this.life = life;
        if (life < 1) this.val = target;
    }
    step() {
        if (this.life < 1) {
            return this.val
        }
        this.life--;
        this.val += this.increments;
        return this.val;
    }
}

class Exciter extends SampleBySampleOperator {
    /** 
     * attack, seconds
     * @type {number} 
     */
    attack = 0.1;

    /** 
     * decay, seconds
     * @type {number} 
     */
    decay = 0;

    /** 
     * duration, seconds
     * @type {number} 
     */
    duration = 0;

    /**
     * @type {{val: number}}
     */
    envelope = new Lerper();

    start({ amp }) { }
}

class NoiseExciter extends Exciter {
    attack = 0.1;
    decay = 0;
    duration = 0;

    /**
     * @type {Lerper}
     */
    envelope = new Lerper();
    noise = new Noise();
    currentStage = 0;

    constructor() {
        super()
    }

    start({ amp }) {
        this.envelope.set(
            0,
            amp * liveParameters.exciter_level,
            this.attack * samplingRate
        )
        this.currentStage = 0;
    }
    operation = () => {
        let aLevel = this.envelope.step();
        let n = this.noise.operation();
        if (this.decay === 0) this.decay = Infinity;
        if (this.envelope.life < 1) {
            this.currentStage++;
            if (this.currentStage == 1) {
                this.envelope.set(this.envelope.val, 0, this.decay * samplingRate)
            }
        }
        return n *= aLevel;
    }
}

class PluckerExciter extends Exciter {
    attack = 0.1;
    decay = 0.3;
    duration = 0;

    freq = 3;
    interval = samplingRate / this.freq;
    waveCounter = 0;

    /**
     * @type {Lerper}
     */
    envelope = new Lerper();
    currentStage = 0;

    constructor() {
        super()
    }

    start({ amp }) {
        this.envelope.set(
            0,
            amp * liveParameters.exciter_level,
            this.attack * samplingRate
        )
        this.currentStage = 0;
    }
    operation = () => {
        let aLevel = this.envelope.step();
        let n = ((this.waveCounter % this.interval) / this.interval) * 2 - 1;
        this.waveCounter++;
        if (this.envelope.life < 1) {
            this.currentStage++;
            if (this.currentStage == 1) {
                this.envelope.set(this.envelope.val, 0, this.decay * samplingRate)
            }
        }
        return n *= aLevel;
    }
}

/**
 * @typedef {'noise' | 'input' | 'plucker'} ExciterTypeName
 * */

class KarplusVoice extends Voice {
    splsLeft = 0;
    bleed = 0;
    engaged = false;
    measuredOutputLevel = 0;
    applyGain = 1;
    filterWet = 0.5;
    ampToFeedback = -1;
    exciterToTime = 0;
    levelToTime = 0;
    currentNormalSamplingPeriod = 1;
    useInputExciter = false;
    delayLine1 = new DelayLine();

    /**  @type {Exciter} */
    exciter = new (KarplusVoice.getExciterConstructor())();
    syncExciterType = () => {
        const targetExciter = KarplusVoice.getExciterConstructor();
        if(targetExciter === this.exciter.constructor) return;
        if(targetExciter === Exciter) {
            this.useInputExciter = true;
        }
        this.exciter = new (KarplusVoice.getExciterConstructor())();
    }

    filter1 = new LpBoxcar(0.1);
    dcRemover = new DCRemover();

    /** @type {Array<KarplusVoice>} */
    otherVoices = [];

    constructor(voicesPool = []) {
        super();
        // so that it's possible to "leak" sound accross voices
        this.otherVoices = voicesPool;

    }


    trig({ freq, amp, dur }) {
        this.noiseEnvVal = amp;
        this.currentNormalSamplingPeriod = samplingRate / freq;
        this.delayLine1.delaySamples = this.currentNormalSamplingPeriod;
        // to be removed
        this.delayLine1.feedback = liveParameters.delay_feedback;
        this.isBusy = true;
        this.engaged = true;
        this.splsLeft = dur ? dur * samplingRate : Infinity;
        this.dcRemover.memory = 0;
        this.bleed = liveParameters.cross_feedback;
        this.filterWet = liveParameters.filter_wet;
        this.ampToFeedback = liveParameters.level_to_feedback;
        this.exciterToTime = liveParameters.exciter_detuning;
        this.levelToTime = liveParameters.amp_detuning;
        //exciter
        this.syncExciterType();
        this.exciter.attack = liveParameters.exciter_att;
        this.exciter.decay = liveParameters.exciter_decay;
        this.exciter.start({ amp });
    }
    stop() {
        this.noiseEnvVal = 0;
        this.isBusy = false;
        this.engaged = false;
        this.splsLeft = 0;
        this.measuredOutputLevel = 0;
        this.filter1.reset();
        this.delayLine1.reset();

    }
    /** 
     * @param {number} blockSize 
     * @param {KarplusParameters} parameters 
     * @param {Float32Array} input
     * @returns {Float32Array} 
     */
    getBlock(blockSize, parameters, input) {
        const output = new Float32Array(blockSize);
        const aWet = 1 - this.filterWet;
        const { delayFeedback, filterK } = parameters;
        const delayFeedback0 = delayFeedback[0];
        const filterK0 = filterK[0];
        if (!this.engaged) return output;

        for (let splN = 0; splN < blockSize; splN++) {
            let sampleNow = 0;
            /**
             * noise exciter
             */
            const exciter = this.useInputExciter ? input[splN] : this.exciter.operation(0);
            /**
             * uncomment to listen to exciter only
             *
            output[splN] = sampleNow;
            continue

            /**/
            let paramDelayFeedback = delayFeedback0;
            if (delayFeedback.length > 1) {
                paramDelayFeedback = delayFeedback[splN];
            }
            /* set filter K for this sample to the maybe modulated filterK parameter */
            let paramFilterK = filterK0;
            if (filterK.length > 1) {
                paramFilterK = filterK[splN];
            }
            this.filter1.k = paramFilterK;
            /**
             * delay line
             */
            sampleNow += this.delayLine1.operation(exciter, (dry) => {
                let w = this.filter1.operation(dry)
                w = w * this.filterWet + dry * aWet;
                const lv = Math.abs(w);
                this.measuredOutputLevel -= 0.00001
                if (lv > this.measuredOutputLevel) {
                    this.measuredOutputLevel += lv / 1000
                }

                const amplification = clamp(1 / this.measuredOutputLevel, 0, 1.01);
                this.delayLine1.feedback = paramDelayFeedback * (1 - this.ampToFeedback) + amplification * this.ampToFeedback;

                return w;
            });

            sampleNow = this.dcRemover.operation(sampleNow);
            sampleNow = clip(sampleNow);

            // bleed
            // if (this.bleed) this.otherVoices.forEach(voice => {
            //     if (voice.engaged && voice !== this) {
            //         voice.delayLine1.operationNoTime(sampleNow * this.bleed);
            //     }
            // });

            if (this.exciterToTime) {
                this.delayLine1.delaySamples = this.currentNormalSamplingPeriod
                    + this.exciterToTime * this.exciter.envelope.val * samplingRate;
            }
            if (this.exciterToTime) {
                this.delayLine1.delaySamples += this.levelToTime * this.measuredOutputLevel * samplingRate / 10;
            }

            output[splN] = sampleNow;

        }
        this.splsLeft -= blockSize;
        if (this.splsLeft <= 0) {
            this.stop();
        }
        // console.log(probe);
        return output;
    }
}
/** @type {ExciterTypeName} */
KarplusVoice.exciterType = 'noise';
KarplusVoice.getExciterConstructor = () => {
    switch (KarplusVoice.exciterType) {
        case 'noise':
            return NoiseExciter;
        case 'plucker':
            return PluckerExciter;
        case 'input':
            // will not be used
            return Exciter;
        default:
            throw new Error('unknown exciter type ' + KarplusVoice.exciterType);
    }
}

/**
 * @template V
 * @typedef {(...p:any)=>V & Voice} VoiceFactory
 * @returns {V} 
 */
/**
 * @template {Voice} V
 */
class PoliManager {
    maxVoices = 32;
    /** @type {Array<V>} */
    list = [];
    lastStolenVoice = 0;
    /** 
     * @param { VoiceFactory<V> } voiceFactory
     **/
    constructor(voiceFactory) {
        /**
         * @returns {V}
         */
        this.getVoice = () => {
            /** @type {V | null} */
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
                    found = voiceFactory(this.list);
                    this.list.push(found);
                }
            }
            return found;
        }
    }
}


/**
 * @typedef  {Object} KarplusStopVoiceMessage
 * @property {true} stop
 * @property {string} identifier
*/
/**
 * @typedef {Object} KarplusStopAllMessage 
 * @property {true} stopall: true;
*/

/**
  * @typedef {Object} KarplusStartVoiceMessage 
  * @property {number} f frequency
  * @property {number} a amplitude or velocity
  * @property {number?} s length of the note
  * @property {number} i identifier
*/
/**
 * @typedef {Object} KarplusParamsChangeMessage 
 * @property {number?} fff feedback-filter's cutoff frequency
 * @property {number?} ffw feedback-filter's wet
 * @property {number?} ff feedback amt
 * @property {number?} xf cross-feedback amt
 * @property {number?} exa exciter attack
 * @property {number?} exd exciter decay
 * @property {ExciterTypeName?} extype exciter type
*/
/**
 * @typedef {Object} KarplusParameters
 * @property {number[]} parameters.delayFeedback
 * @property {number[]} parameters.filterK
 */
/* to make ts work */
if (false) {
    function registerProcessor(arg0, arg1) {
        throw new Error("Function not implemented.");
    }
}

const clamp = (v, min, max) => {
    if (v < min) return min
    if (v > max) return max
    return v
}
// @ts-ignore
registerProcessor('karplus', class extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            {
                name: "delayFeedback",
                defaultValue: 1,
                minValue: -1.5,
                maxValue: 1.5,
                automationRate: "a-rate",
            },
            {
                name: "filterK",
                defaultValue: 1,
                minValue: 0,
                maxValue: 1,
                automationRate: "a-rate",
            },
        ];
    }
    constructor() {
        super();
        /** @type {Array<Voice>} */
        this.activeVoices = [];
        this.samples = [];
        this.totalSamples = 0;

        // @ts-ignore
        this.port.onmessage = ({ data }) => {
            if (data.stopall) {
                this.polimanager.list.forEach(voice => voice.stop());
            }
            if (data.stop && data.i) {
                if (this.activeVoices[data.i]) {
                    this.activeVoices[data.i].stop();
                    delete this.activeVoices[data.i];
                } else {
                    console.warn("no voice " + data.i + " to stop");
                }
            }
            if (data.f) {
                const freq = data.f;
                const dur = data.s || 0;
                const amp = data.a || 1;
                const tVoice = this.polimanager.getVoice();

                if (data.i) {
                    this.activeVoices[data.i] = tVoice;
                }

                const fALog = Math.min(Math.log2(
                    clamp(freq, 55, 15000) - 54
                ) / 14, 1)
                const slope = fALog - liveParameters.filter_k

                tVoice.filter1.k = liveParameters.filter_k + fALog * slope;

                tVoice.trig({ freq, amp, dur });
            }
            if (!isNaN(data.fff)) {
                liveParameters.filter_k = data.fff;
            }
            if (!isNaN(data.ffw)) {
                liveParameters.filter_wet = data.ffw;
            }
            if (!isNaN(data.exv)) {
                liveParameters.exciter_level = data.exv
            }
            if (!isNaN(data.exa)) {
                liveParameters.exciter_att = data.exa
            }
            if (!isNaN(data.exd)) {
                liveParameters.exciter_decay = data.exd
            }
            if (!isNaN(data.ff)) {
                liveParameters.delay_feedback = data.ff
            }
            if (!isNaN(data.xf)) {
                liveParameters.cross_feedback = data.xf
            }
            if (!isNaN(data.atoff)) {
                liveParameters.level_to_feedback = data.atoff
            }
            if (!isNaN(data.exdet)) {
                liveParameters.exciter_detuning = data.exdet
            }
            if (!isNaN(data.adet)) {
                liveParameters.amp_detuning = data.adet
            }
            if (data.extype) {
                KarplusVoice.exciterType = data.extype;
            }
        };
    }
    polimanager = new PoliManager((...p) => new KarplusVoice(...p));
    /**
     * @param {Float32Array[][]} inputs
     * @param {Float32Array[][]} outputs
     * @param {KarplusParameters} parameters
     */
    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const input = inputs[0];
        const inputChannel = input[0];
        const blockSize = outputs[0][0].length;
        const mix = new Float32Array(blockSize);
        this.polimanager.list.forEach((voice) => {
            const voiceResults = voice.getBlock(blockSize, parameters, inputChannel);
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
