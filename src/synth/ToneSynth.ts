import { Voice, Synth } from './Synth';
import * as Tone from 'tone'

export class ToneSynth implements Synth {
    synth: Tone.Synth | null;
    playNoteEvent(startTimeSecondsFromNow: number, duration: number, frequency: number) {
        if (!this.synth) throw new Error("synth is not initialized");
        const now = Tone.now();
        const start = now + startTimeSecondsFromNow;
        // trigger the attack immediately
        this.synth.triggerAttack(frequency, start);
        // wait one second before triggering the release
        this.synth.triggerRelease(now + duration);
    }

    setAudioContext(audioContext: AudioContext) {
        // there is clearly a problem with tone lib.
        Tone.start().then(() => {
            this.synth = new Tone.Synth().toDestination();
        });
    }

    stopAllNotes() {
        if (!this.synth) throw new Error("synth is not initialized");
        this.synth.triggerRelease();
    }
    constructor() {
        this.synth = null;
        // const initfn = async () => {
        //     if (Tone.context.state) return console.log("already initialized");
        //     await Tone.start();
        //     console.log("Tone js context started");
        //     document.querySelector("body")?.removeEventListener("click", initfn);
        // }
        // document.querySelector("body")?.addEventListener("click", initfn);
    }
}
