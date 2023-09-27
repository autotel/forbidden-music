import { createKarplusWorklet } from "../functions/karplusWorkletFactory";
import { NumberSynthParam, OptionSynthParam, ParamType, SynthInstance, SynthParam } from "./SynthInterface";

// It's really difficult to measure the filter cutoff, though possible.
// maybe we can use this approach to comb filter instead of the worklet
// https://itnext.io/algorithmic-reverb-and-web-audio-api-e1ccec94621a
// perhaps its even cheaper computationally and allow me more exploration

type KarplusExciterType = "noise" | "multiplux";

interface KarplusStopVoiceMessage {
    stop: true;
    // identifier
    i: string;
}

interface KarplusStopAllMessage {
    stopall: true;
}

interface KarplusStartVoiceMessage {
    // frequency
    f: number;
    // amplitude or velocity
    a: number;
    // length of the note
    s?: number;
    // identifier
    i: string;
}

interface KarplusParamsChangeMessage {
    // feedback filter cutoff frequency
    fff?: number
    // feedback-filter's wet
    ffw?: number
    // feedback amount
    ff?: number
    // cross-feedback amount
    xf?: number
    // exciter overall level
    exv?: number
    // exciter attack
    exa?: number
    // exciter decay
    exd?: number
    // proportionality of amp to feedback
    atoff?: number
    // proportionality of amp env to feedback time
    adet?: number
    // proportionality of exciter env to feedback time
    exdet?: number
    // type of exciter
    extype?: KarplusExciterType
}

const postToPromised = async (promise: Promise<AudioWorkletNode>, message: any) => {
    const target = await promise;
    return target.port.postMessage(message);
}

export class KarplusSynth implements SynthInstance {
    private audioContext?: AudioContext;
    gainNode?: GainNode;
    engine?: AudioWorkletNode;
    private resolveEnginePromise?: Function;
    enable: () => void;
    disable: () => void;
    constructor(audioContext: AudioContext) {
        this.setAudioContext(audioContext);
        // TODO... or not
        this.enable = () => { }
        this.disable = () => { }
        const enginePromise = new Promise<AudioWorkletNode>((res) => {
            this.resolveEnginePromise = res;
        });

        const fffParam = {
            type: ParamType.number,
            _v: 1,
            set value(v: number) {
                this._v = v;
                postToPromised(enginePromise, {
                    fff: v,
                } as KarplusParamsChangeMessage);
            },
            get value() {
                return this._v;
            },
            displayName: "boxcar K",
            min: 0,
            max: 1,
            exportable: true,
        } as NumberSynthParam;
        this.params.push(fffParam)
        fffParam.value = 0.128;

        const ffwParam = {
            type: ParamType.number,
            _v: 1,
            set value(v: number) {
                this._v = v;
                postToPromised(enginePromise, {
                    ffw: v,
                } as KarplusParamsChangeMessage);
            },
            get value() {
                return this._v;
            },
            displayName: "Filter wet",
            min: 0,
            max: 1,
            exportable: true,
        } as NumberSynthParam;
        this.params.push(ffwParam)
        ffwParam.value = 0.645;

        const ffParam = {
            type: ParamType.number,
            _v: 1,
            set value(v: number) {
                this._v = v;
                postToPromised(enginePromise, {
                    ff: v,
                } as KarplusParamsChangeMessage);
            },
            get value() {
                return this._v;
            },
            displayName: "feedback",
            min: -1.5,
            max: 1.5,
            exportable: true,
        } as NumberSynthParam;
        this.params.push(ffParam)
        ffParam.value = -0.630;

        const exaParam = {
            type: ParamType.number,
            _v: 1,
            set value(v: number) {
                this._v = v;
                postToPromised(enginePromise, {
                    exa: v,
                } as KarplusParamsChangeMessage);
            },
            get value() {
                return this._v;
            },
            displayName: "exciter attack",
            min: 0,
            max: 10,
            exportable: true,
            curve:'log'
        } as NumberSynthParam;
        this.params.push(exaParam)
        exaParam.value = 0.750

        const exvParam = {
            type: ParamType.number,
            _v: 1,
            set value(v: number) {
                this._v = v;
                postToPromised(enginePromise, {
                    exv: v,
                } as KarplusParamsChangeMessage);
            },
            get value() {
                return this._v; 
            },
            displayName: "exciter level",
            min: 0,
            max: 1,
            exportable: true,
            curve:'log'
        } as NumberSynthParam;
        this.params.push(exvParam)
        exvParam.value = 0.523

        const exdParam = {
            type: ParamType.number,
            _v: 1,
            set value(v: number) {
                this._v = v;
                postToPromised(enginePromise, {
                    exd: v,
                } as KarplusParamsChangeMessage);
            },
            get value() {
                return this._v;
            },
            displayName: "exciter decay",
            min: 0,
            max: 10,
            exportable: true,
            curve:'log'
        } as NumberSynthParam;
        this.params.push(exdParam)
        exdParam.value = 8.341

        // const xfParam = {
        //     type: ParamType.number,
        //     _v: 1,
        //     set value(v: number) {
        //         this._v = v;
        //         postToPromised(enginePromise, {
        //             xf: v,
        //         } as KarplusParamsChangeMessage);
        //     },
        //     get value() {
        //         return this._v;
        //     },
        //     displayName: "cross-feedback",
        //     min: -0.001,
        //     max: 0.001,
        //     exportable: true,
        // } as NumberSynthParam;
        // this.params.push(xfParam)
        // xfParam.value = 0


        const atoffParam = {
            type: ParamType.number,
            _v: 1,
            set value(v: number) {
                this._v = v;
                postToPromised(enginePromise, {
                    atoff: v,
                } as KarplusParamsChangeMessage);
            },
            get value() {
                return this._v;
            },
            displayName: "level to feedback relation",
            min: 0,
            max: 1,
            exportable: true,
        } as NumberSynthParam;
        this.params.push(atoffParam)
        atoffParam.value = 0.93

        const exdetParam = {
            type: ParamType.number,
            _v: 1,
            set value(v: number) {
                this._v = v;
                postToPromised(enginePromise, {
                    exdet: v,
                } as KarplusParamsChangeMessage);
            },
            get value() {
                return this._v;
            },
            displayName: "detune according to exciter level",
            min: -0.01,
            max: 0.01,
            exportable: true,
        } as NumberSynthParam;
        this.params.push(exdetParam)
        exdetParam.value = 0.001


        const adetParam = {
            type: ParamType.number,
            _v: 1,
            set value(v: number) {
                this._v = v;
                postToPromised(enginePromise, {
                    adet: v,
                } as KarplusParamsChangeMessage);
            },
            get value() {
                return this._v;
            },
            displayName: "detune according to exciter level",
            min: -0.01,
            max: 0.01,
            exportable: true,
        } as NumberSynthParam;
        this.params.push(adetParam)
        adetParam.value = 0 

        const extypeParam:OptionSynthParam = {
            type: ParamType.option,
            set value(v: number) {
                this._v = v;
                postToPromised(enginePromise, {
                    extype: this.options[v].value,
                } as KarplusParamsChangeMessage);
            },
            get value() {
                return this._v;
            },
            exportable: true,
            options: [{
                value: "noise",
                displayName: "noise",
            },{
                value: "multiplux",
                displayName: "multiplux",
            },],
            displayName: "exciter type",
        }
        this.params.push(extypeParam)

    }

    async setAudioContext(audioContext: AudioContext) {
        if (this.audioContext) {
            throw new Error("audio context already set");
        }
        this.audioContext = audioContext;
        this.engine = await createKarplusWorklet(audioContext);
        if (!this.resolveEnginePromise) throw new Error("resolveEnginePromise is " + this.resolveEnginePromise)
        this.resolveEnginePromise(this.engine);
        this.gainNode = this.audioContext.createGain();
        this.engine.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);


    }

    releaseAll = () => {
        console.log("stopping all notes");
        if (this.engine) this.engine.port.postMessage({ stopall: true } as KarplusStopAllMessage);
    };

    name = "Karplus";
    triggerAttackRelease = (
        frequency: number,
        duration: number,
        relativeNoteStart: number,
        velocity: number
    ) => {
        if (!this.audioContext) throw new Error("audio context not created");
        if (!this.engine) throw new Error("engine not created");
        if (relativeNoteStart < 0) relativeNoteStart = 0;
        const startTime = this.audioContext.currentTime + relativeNoteStart;

        this.engine.port.postMessage({
            f: frequency,
            a: velocity,
            s: duration,
            i: frequency.toFixed(4)
        } as KarplusStartVoiceMessage);
    };
    triggerPerc = (frequency: number, relativeNoteStart: number, velocity: number) => {
        if (!this.audioContext) throw new Error("audio context not created");
        if (!this.engine) throw new Error("engine not created");
        if (relativeNoteStart < 0) relativeNoteStart = 0;
        const startTime = this.audioContext.currentTime + relativeNoteStart;

        this.engine.port.postMessage({
            f: frequency,
            a: velocity,
            s: 8, // TODO: create a perc mode to this synth
            i: frequency.toFixed(4)
        } as KarplusStartVoiceMessage);
    };
    params = [] as SynthParam[];
    credits = "Karplus strong synth implementation by Autotel.";

}