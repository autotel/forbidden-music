import { Voice, Synth } from "./Synth";

class SawtoothVoice implements Voice {
    inUse: boolean;
    audioContext: AudioContext;

    gainNode: GainNode;
    oscillator: OscillatorNode;
    filterNode: BiquadFilterNode;

    constructor(audioContext: AudioContext, destination: AudioNode) {
        this.audioContext = audioContext;
        this.inUse = false;

        this.filterNode = audioContext.createBiquadFilter();
        this.gainNode = audioContext.createGain();
        this.oscillator = this.resetOscillator();

        this.filterNode.connect(this.gainNode);
        this.gainNode.connect(destination);

        this.filterNode.Q.value = 0.7;
        this.filterNode.frequency.value = 2000;
    }

    triggerAttack(frequency: number, velocity: number, now: number = this.audioContext.currentTime) {
        this.scheduleAttack(frequency, velocity, now);
    }

    scheduleAttack(frequency: number, velocity: number, when?: number, now: number = this.audioContext.currentTime) {
        this.resetOscillator();
        this.gainNode.gain.cancelScheduledValues(now - 0.01);
        this.inUse = true;
        this.oscillator.frequency.value = frequency;
        this.filterNode.frequency.value = frequency;
        // this.gainNode.gain.value = velocity;
        this.gainNode.gain.setValueAtTime(velocity, now);
    }

    resetOscillator() {
        this.oscillator?.stop();
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = "sawtooth";
        this.oscillator.connect(this.filterNode);
        this.oscillator.start();
        // just to make ts happy
        return this.oscillator;
    }

    scheduleEnd(endTimeSeconds: number, now: number = this.audioContext.currentTime) {
        if (typeof endTimeSeconds !== "number") throw new Error("endTimeSeconds is not a number");

        console.log("end in", endTimeSeconds - now);
        this.gainNode.gain.setValueAtTime(0, endTimeSeconds);

        setTimeout(() => {
            this.inUse = false;
        }, endTimeSeconds * 1000 + 40);
    }
}
export class SawtoothSynth extends Synth {
    constructor() {
        super((audioContext, destination) => new SawtoothVoice(audioContext, destination));
    }
}
export default SawtoothSynth;