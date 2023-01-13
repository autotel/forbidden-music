import { createAdsrWorklet } from "../functions/adsrWorkletFactory";
import { Synth, Voice } from "./Synth";
import AdsrNode from "../functions/AdsrNode";
// maybe use https://github.com/g200kg/audioworklet-adsrnode instead
// transitioning to adsr because the other was a bit bad
/**
 * step 0: enveloped sine synth using adsrenvelope audioNode
 * step 1: sine wave voice with one envelope. The routing of envelope to amplitude is controllable
*/

type AudioNodeLike = {
    connect: (to: AudioNode) => {}
}

interface WrappedOscillator {
    oscillator: false | OscillatorNode;
    destinationNode: false | AudioNode;
    resetOscillator(): void;
    started: boolean;
    readonly node: OscillatorNode;
    frequency: number;
    start(when?: number): void;
    stop(when?: number): void;
    output: AudioNode;
};
// Oscillator nodes are extremely annoying to use, this wrapper intends to help a bit.
const makeOscillator = (audioContext: AudioContext) => {
    const val = {
        oscillator: false as OscillatorNode | false,
        destinationNode: false as AudioNode | false,
        __frequency: 0,
        resetOscillator() {
            if (this.oscillator) {
                if (this.started) {
                    this.oscillator.stop();
                }
                this.oscillator.disconnect();
            }
            this.oscillator = audioContext.createOscillator();
            if (this.destinationNode) {
                this.oscillator.connect(this.destinationNode);
            } else {
                console.warn("this oscillator has not destination set", this);
            }
        },
        started: false,
        get node() {
            if (!this.oscillator) {
                this.resetOscillator();
            }
            return this.oscillator
        },
        set frequency(f: number) {
            this.__frequency = f;
            if (this.oscillator && this.started) {
                this.oscillator.frequency.value = f;
            }
        },
        get frequency() {
            return this.__frequency;
        },
        start(when = audioContext.currentTime) {
            this.resetOscillator();
            this.started = true;
            if (!this.oscillator) throw new Error("exception: oscillator not created correctly");
            this.oscillator.start(when);
            this.oscillator.frequency.value = this.frequency;
        },
        stop(when = audioContext.currentTime) {
            if (this.oscillator) {
                this.oscillator.stop(when);
            }
        },
        set output(to: AudioNode) {
            this.destinationNode = to;
            if (this.oscillator) {
                this.oscillator.disconnect();
                this.oscillator.connect(to);
            }
        },

    }
    return val as WrappedOscillator;
}
interface WrappedConnector {
    readonly node: GainNode;
    value: number;
    name:string,
    sourceName:string,
    destName:string,

}
const makeConnector = (audioContext: AudioContext, from: AudioNode, to: AudioNode | AudioParam) => {
    const gain = audioContext.createGain();
    gain.gain.value = 0;
    from.connect(gain);
    //@ts-ignore
    gain.connect(to);
    const val = {
        name:"",
        sourceName:"",
        destName:"",
        get node() {
            return gain
        },
        set value(newValue) {
            gain.gain.value = newValue;
        },
        get value() {
            return gain.gain.value
        }
    }
    return val as WrappedConnector;
}
interface WrappedAdsr {
    destinationNode: false | AudioNode;
    trigger(tval?: number, when?: number): void;
    release(when?: number): void;
    readonly node: any;
    output: AudioNode | AudioParam;
}
const makeEnvelope = (audioContext: AudioContext) => {
    const val = {
        _adsrGen: false as any | false,
        destinationNode: false as AudioNode | AudioParam | false,
        // TODO: I am not so sure about creating audioParams just to make ts happy
        // these audioparams are guaranteed after _adsrGen is created
        _sustain: {} as AudioParam,
        _release: {} as AudioParam,
        _attack: {} as AudioParam,
        _attackcurve: {} as AudioParam,
        _decay: {} as AudioParam,
        _trigger: {} as AudioParam,

        trigger(tval = 1, when = 0) {
            if (this._adsrGen) {
                if (when) {
                    this._trigger.setValueAtTime(tval, when);
                } else {
                    this._trigger.value = tval;
                }
            }
        },
        release(when = 0) {
            this.trigger(0, when);
        },
        get node() {
            return this._adsrGen
        },
        set output(to: AudioNode | AudioParam) {
            this.destinationNode = to;
            if (this._adsrGen) {
                this._adsrGen.disconnect();
                this._adsrGen.connect(to);
            }
        },
        set adsrGen(to: AudioWorkletNode) {
            this._adsrGen = to;
            if (this.destinationNode) {
                this.output = this.destinationNode;
            }
        }
    }

    createAdsrWorklet(audioContext, {
        attack: 0.5,
        attackcurve: 0,
        decay: 0.6,
        sustain: 0.01,
        release: 0.8
    }).then((adsr) => {
        const vval = val;
        vval.adsrGen = adsr;

        vval._attack = adsr.parameters.get('attack');
        vval._attackcurve = adsr.parameters.get('attackcurve');
        vval._decay = adsr.parameters.get('decay');
        vval._sustain = adsr.parameters.get('sustain');
        vval._release = adsr.parameters.get('release');
        vval._trigger = adsr.parameters.get('trigger');

    });

    return val as WrappedAdsr;
}

const makeEnvelope2 = (audioContext: AudioContext) => {
    const val = {
        _adsrGen: false as AdsrNode | false,
        destinationNode: false as AudioNode | AudioParam | false,

        trigger(tval = 1, when = 0) {
            // this operator supposedly doesn't need to be re-created, but 
            // it is not working without it
            if (this._adsrGen) {
                this._adsrGen.disconnect();
            }
            this._adsrGen = new AdsrNode(audioContext, {
                attack: 0.05,
                attackcurve: 0,
                decay: 0.6,
                sustain: 0.01,
                release: 0.8
            });
            if (this.destinationNode) {
                //@ts-ignore
                this._adsrGen.connect(this.destinationNode);
            }
            if (when) {
                this._adsrGen.trigger.setValueAtTime(when, tval);
            } else {
                this._adsrGen.trigger.value = tval;
            }
        },
        release(when = 0) {
            this.trigger(0, when);
        },
        get node() {
            return this._adsrGen
        },
        set output(to: AudioNode | AudioParam) {
            this.destinationNode = to;
            if (this._adsrGen) {
                this._adsrGen.disconnect();
                //@ts-ignore
                this._adsrGen.connect(to);
            }
        },
    }
    return val as WrappedAdsr;
}

const makeMap = (callback: (n: number) => any, times: number) => {
    let ret = [];
    for (let i = 0; i < times; i++) {
        ret.push(callback(i));
    }
    return ret;
};


class FmVoice implements Voice {

    inUse: boolean;
    audioContext: AudioContext;
    gainNode: GainNode;

    connectors = [] as WrappedConnector[];

    // patcheable operators
    oscillator = [] as WrappedOscillator[];
    env = [] as WrappedAdsr[];

    // patch sources
    key = {};
    offsetVal = 1;

    triggerAttack(frequency: number, velocity = 0, currentTime = this.audioContext.currentTime) {
        this.scheduleAttack(frequency, velocity, 0);
    }

    scheduleAttack(frequency: number, velocity: number, when?: number, currentTime = this.audioContext.currentTime) {
        console.log("trigger attack", frequency);
        this.oscillator.frequency = frequency;
        this.env.forEach(e => e.trigger(velocity, when));
        this.oscillator.forEach(o => o.start(when));
        this.inUse = true;
    }

    scheduleEnd(endTimeSeconds: number = 0, playbackTime = this.audioContext.currentTime) {
        this.env.forEach(e => e.release(endTimeSeconds));
        // to-do: prevent repetition of this timeout by clear timeout
        setTimeout(() => {
            this.inUse = false;
            this.oscillator.forEach(o => o.stop());
        }, (endTimeSeconds + 1) * 1000);
        // todo - the + 1 is for the release time
    }

    constructor(audioContext: AudioContext, destination: AudioNode) {
        this.inUse = false;
        this.audioContext = audioContext;

        this.gainNode = audioContext.createGain();
        this.gainNode.connect(destination);
        this.gainNode.gain.value = 0;

        for (let i = 0; i < 4; i++) {
            const env = makeEnvelope2(audioContext);
            const osc = makeOscillator(audioContext);

            this.env.push(env);
            this.oscillator.push(osc);
        }

        // connect each env to each osc frequency
        this.env.forEach((env,envIt) => {
            this.oscillator.forEach((osc) => {
                const newConnector = makeConnector(audioContext, env.node, osc.node.frequency);
                newConnector.sourceName = 'env' + envIt;
            });
        }
}

export class FmSynth extends Synth {
    constructor() {
        super((audioContext, destination) => new FmVoice(audioContext, destination));
    }
}