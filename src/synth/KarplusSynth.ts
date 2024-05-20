import { createKarplusWorklet } from "../functions/karplusWorkletFactory";
import { AutomatableSynthParam } from "./interfaces/Automatable";
import { ParamType, NumberSynthParam, OptionSynthParam, SynthParam } from "./interfaces/SynthParam";
import { SynthVoice, Synth } from "./super/Synth";
// It's really difficult to measure the filter cutoff, though possible.
// maybe we can use this approach to comb filter instead of the worklet
// https://itnext.io/algorithmic-reverb-and-web-audio-api-e1ccec94621a
// perhaps its even cheaper computationally and allow me more exploration

type KarplusExciterType = "noise" | "multiplux";

interface KarplusStopVoiceMessage {
    stop: true;
    // identifier
    i: number;
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
    i?: number;
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

const karplusVoice = (audioContext: AudioContext, synth: KarplusSynth): SynthVoice => {
    let myVoiceIndex = synth.instances.length;
    return {
        inUse: false,
        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            { velocity }: { velocity: number }
        ) {
            this.inUse = true;
            // TODO: somehow make the start time precise
            setTimeout(() => {
                if (!synth.engine) throw new Error("engine not created");
                synth.engine.port.postMessage({
                    f: frequency,
                    a: velocity,
                    i: myVoiceIndex,
                } as KarplusStartVoiceMessage)
            }, (absoluteStartTime - synth.audioContext.currentTime) * 1000);
            return this;
        },
        scheduleEnd(absoluteStopTime: number) {
            // TODO: somehow make the start time precise
            setTimeout(() => {
                if (!synth.engine) throw new Error("engine not created");
                synth.engine.port.postMessage({
                    stop: true,
                    i: myVoiceIndex,
                } as KarplusStopVoiceMessage);
                this.inUse = false;
            }, (absoluteStopTime - synth.audioContext.currentTime) * 1000);
            return this;
        },
        stop() {
            if (!synth.engine) throw new Error("engine not created");
            synth.engine.port.postMessage({
                stop: true,
                i: myVoiceIndex,
            } as KarplusStopVoiceMessage);
            this.inUse = false;
        }

    }
}

// NOTE: implements instead of extends because it manages its own voices 
// in a different way than usual
export class KarplusSynth extends Synth {
    engine?: AudioWorkletNode;
    constructor(audioContext: AudioContext) {
        super(audioContext, karplusVoice);
        this.output.gain.value = 0.5;
        this.name = "Karplus";
        const enginePromise = createKarplusWorklet(audioContext)

        enginePromise.then((engine) => {
            this.engine = engine;
            console.log("new karplus audio worklet", engine);
            this.engine.connect(this.output);
        });

        const postToPromised = async (promise: Promise<AudioWorkletNode>, message: any) => {
            const target = await promise;
            return target.port.postMessage(message);
        };

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
            animate(startTime: number, destTime: number, destValue: number) {
                enginePromise.then((engine) => {
                    // @ts-ignore
                    engine.parameters.get("filterK").linearRampToValueAtTime(destValue, destTime);
                })
            },
            stopAnimations() {
                enginePromise.then((engine) => {
                    // @ts-ignore
                    engine.parameters.get("filterK").cancelScheduledValues(0);
                })
            },
            displayName: "boxcar K",
            min: 0,
            max: 1,
            exportable: true,
        } as AutomatableSynthParam;
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
                // postToPromised(enginePromise, {
                //     ff: v,
                // } as KarplusParamsChangeMessage);
                enginePromise.then((engine) => {
                    // @ts-ignore
                    engine.parameters.get("delayFeedback").setValueAtTime(v, 0);
                })
            },
            get value() {
                return this._v;
            },
            animate(startTime: number, destTime: number, destValue: number) {
                enginePromise.then((engine) => {
                    // console.log("animating", v, t, t - audioContext.currentTime );
                    // @ts-ignore
                    engine.parameters.get("delayFeedback").linearRampToValueAtTime(destValue, destTime);
                })
            },
            stopAnimations() {
                enginePromise.then((engine) => {
                    // @ts-ignore
                    engine.parameters.get("delayFeedback").cancelScheduledValues(0);
                })
            },
            displayName: "feedback",
            min: -1.5,
            max: 1.5,
            default: 0,
            exportable: true,
        } as AutomatableSynthParam;
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
            curve: 'log'
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
            curve: 'log'
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
            curve: 'log'
        } as NumberSynthParam;
        this.params.push(exdParam)
        exdParam.value = 8.341

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
            displayName: "exciter -> detune",
            min: -0.01,
            max: 0.01,
            default: 0,
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
            displayName: "amp -> detune",
            min: -0.01,
            max: 0.01,
            default: 0,
            exportable: true,
        } as NumberSynthParam;
        this.params.push(adetParam)
        adetParam.value = 0

        const extypeParam: OptionSynthParam = {
            type: ParamType.option,
            set value(v: number) {
                if (v >= this.options.length) v = 0;
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
            }, {
                value: "multiplux",
                displayName: "multiplux",
            },],
            displayName: "exciter type",
        }
        this.params.push(extypeParam)

    }
    params = [] as SynthParam[];
    credits = "Karplus strong synth implementation by Autotel.";

}