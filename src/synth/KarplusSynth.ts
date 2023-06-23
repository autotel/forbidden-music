import { createKarplusWorklet } from "../functions/karplusWorkletFactory";
import { SynthInstance, SynthParam } from "./SynthInterface";

// It's really difficult to measure the filter cutoff, though possible.
// maybe we can use this approach to comb filter instead of the worklet
// https://itnext.io/algorithmic-reverb-and-web-audio-api-e1ccec94621a
// perhaps its even cheaper computationally and allow me more exploration



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
// TODO: 
interface KarplusParamsChangeMessage {
    bleed?: number;
    impulseDecay?: number;
    impulseAttack?: number;
    delaysDetune?: number;
}

export class KarplusSynth implements SynthInstance {
    private audioContext?: AudioContext;
    gainNode?: GainNode;
    engine?: AudioWorkletNode;
    enable:()=>void;
    disable:()=>void;
    constructor(audioContext: AudioContext) {
        this.setAudioContext(audioContext);
        // TODO... or not
        this.enable = () => {}
        this.disable = () => {}
    }

    async setAudioContext(audioContext: AudioContext) {
        if (this.audioContext) {
            throw new Error("audio context already set");
        }
        this.audioContext = audioContext;
        this.engine = await createKarplusWorklet(audioContext);
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
        if(relativeNoteStart < 0) relativeNoteStart = 0;
        const startTime = this.audioContext.currentTime + relativeNoteStart;

        this.engine.port.postMessage({
            freq: frequency,
            amp: velocity,
            duration: duration,
            ref: frequency.toFixed(4)
        } as KarplusStartVoiceMessage);
    };
    triggerPerc = (frequency: number, relativeNoteStart: number, velocity: number) => {
        if (!this.audioContext) throw new Error("audio context not created");
        if (!this.engine) throw new Error("engine not created");
        if(relativeNoteStart < 0) relativeNoteStart = 0;
        const startTime = this.audioContext.currentTime + relativeNoteStart;

        this.engine.port.postMessage({
            freq: frequency,
            amp: velocity,
            duration: 8, // TODO: create a perc mode to this synth
            ref: frequency.toFixed(4)
        } as KarplusStartVoiceMessage);
    };
    params = [] as SynthParam[];
    credits = "Karplus strong synth implementation by Autotel.";

}