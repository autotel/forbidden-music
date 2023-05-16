import { Synth } from "./Synth";
import { createFmWorklet } from '../functions/fmWorkletFactory';
import { SynthInstance } from "./SynthInterface";

interface FmStopVoiceMessage {
    stop: true;
    ref: string;
}

interface FmStopAllMessage {
    stopall: true;
}

interface FmStartVoiceMessage {
    freq: number;
    amp: number;
    duration?: number;
    ref: string;
}
// TODO: 
interface FmParamsChangeMessage {
    bleed?: number;
    impulseDecay?: number;
    impulseAttack?: number;
    delaysDetune?: number;
}

export class FmSynth implements SynthInstance {
    private audioContext?: AudioContext;
    gainNode?: GainNode;
    engine?: AudioWorkletNode;
    constructor(audioContext: AudioContext) {
        this.setAudioContext(audioContext);
    }

    async setAudioContext(audioContext: AudioContext) {
        if (this.audioContext) {
            throw new Error("audio context already set");
        }
        this.audioContext = audioContext;
        this.engine = await createFmWorklet(audioContext);
        this.gainNode = this.audioContext.createGain();
        this.engine.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
    }

    releaseAll = () => {
        console.log("stopping all notes");
        if (this.engine) this.engine.port.postMessage({ stopall: true } as FmStopAllMessage);
    };

    name = "Fm";
    triggerAttackRelease = (
        frequency: number,
        duration: number,
        relativeNoteStart: number,
        velocity: number
    ) => {
        if (!this.audioContext) throw new Error("audio context not created");
        if (!this.engine) throw new Error("engine not created");
        const startTime = this.audioContext.currentTime + relativeNoteStart;

        this.engine.port.postMessage({
            freq: frequency,
            amp: velocity,
            duration: duration,
            ref: frequency.toFixed(4)
        } as FmStartVoiceMessage);
    };
    triggerPerc = (frequency: number, relativeNoteStart: number, velocity: number) => {
        if (!this.audioContext) throw new Error("audio context not created");
        if (!this.engine) throw new Error("engine not created");
        const startTime = this.audioContext.currentTime + relativeNoteStart;

        this.engine.port.postMessage({
            freq: frequency,
            amp: velocity,
            duration: 8, // TODO: create a perc mode to this synth
            ref: frequency.toFixed(4)
        } as FmStartVoiceMessage);
    };

    getParams = () => [];
    set = (params: any) => {

    };
    credits = "Fm strong synth implementation by Autotel.";

}