import { Synth } from "./Synth";
import { createKarplusWorklet } from "../functions/karplusWorkletFactory";
export class KarplusSynth implements Synth {
    private audioContext?: AudioContext;
    private destination?: AudioNode;
    gainNode?: GainNode;
    engine?: AudioWorkletNode;
    constructor() {

    }

    async setAudioContext (audioContext: AudioContext) {
        if (this.audioContext) {
            throw new Error("audio context already set");
        }
        this.audioContext = audioContext;
        this.engine = await createKarplusWorklet(audioContext);
        this.gainNode = this.audioContext.createGain();
        this.engine.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
    }

    playNoteEvent(startTimeSecondsFromNow: number, durationSeconds: number, frequency: number) {
        if(this.engine){
            this.engine.port.postMessage({freq:frequency,amp:1, ref:frequency.toFixed(4)});
        }
    }

    stopAllNotes() {
        if(this.engine) this.engine.port.postMessage({stopall:true});
    };
}