import { Synth } from "./Synth";
import { createKarplusWorklet } from "../functions/karplusWorkletFactory";
import { SynthInstance } from "./SynthInterface";

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


export class KarplusSynth implements SynthInstance {
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
        this.engine = await createKarplusWorklet(audioContext);
        this.gainNode = this.audioContext.createGain();
        this.engine.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
    }

    stopAllNotes() {
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
        const startTime = this.audioContext.currentTime + relativeNoteStart;

        this.engine.port.postMessage({ 
            freq: frequency, 
            amp: velocity, 
            duration: duration,
            ref: frequency.toFixed(4) 
        } as KarplusStartVoiceMessage);
    };
    releaseAll = () => { };
    getParams = () => [];
    set = (params: any) => {

    };
    credits = "Karplus strong synth implementation by Autotel.";

}