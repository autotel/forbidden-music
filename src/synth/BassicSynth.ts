import { Voice, Synth } from "./Synth";

class BassicVoice implements Voice {
    inUse: boolean;
    audioContext: AudioContext;

    gainNode: GainNode;
    oscillator: OscillatorNode;
    filterNode1: BiquadFilterNode;
    filterNode2: BiquadFilterNode;
    filterNode3: BiquadFilterNode;
    filterNode4: BiquadFilterNode;

    constructor(audioContext: AudioContext, destination: AudioNode) {
        this.audioContext = audioContext;
        this.inUse = false;

        this.filterNode1 = audioContext.createBiquadFilter();
        this.filterNode2 = audioContext.createBiquadFilter();
        this.filterNode3 = audioContext.createBiquadFilter();
        this.filterNode4 = audioContext.createBiquadFilter();

        this.gainNode = audioContext.createGain();
        this.oscillator = this.resetOscillator();
        this.filterNode1.connect(this.filterNode2);
        this.filterNode2.connect(this.filterNode3);
        this.filterNode3.connect(this.filterNode4);
        this.filterNode4.connect(this.gainNode);
        this.gainNode.connect(destination);

        this.filterNode1.Q.value = 0.7;
        this.filterNode1.frequency.value = 2000;
        this.filterNode2.Q.value = 0.3;
        this.filterNode2.frequency.value = 2000;
        this.filterNode3.Q.value = 0.7;
        this.filterNode3.frequency.value = 2000;
        this.filterNode4.Q.value = 0.8;
        this.filterNode4.frequency.value = 2000;

    }

    triggerAttack(frequency: number, velocity: number, now: number = this.audioContext.currentTime) {
        this.scheduleAttack(frequency, velocity, now);
    }

    scheduleAttack(frequency: number, velocity: number, when?: number,now: number = this.audioContext.currentTime) {
        // reset stuff
        this.oscillator = this.resetOscillator();
        this.gainNode.gain.cancelScheduledValues(now - 0.01);
        this.filterNode1.frequency.cancelScheduledValues(now - 0.01);
        this.filterNode2.frequency.cancelScheduledValues(now - 0.01);
        this.filterNode3.frequency.cancelScheduledValues(now - 0.01);
        this.filterNode4.frequency.cancelScheduledValues(now - 0.01);

        // set note start values
        this.inUse = true;
        this.oscillator.frequency.value = frequency;
        // redundant to ensure no negative values after exponential ramp
        this.gainNode.gain.value = 2 * velocity;
        // this.gainNode.gain.setValueAtTime(4 * velocity,now - 0.01);

        // schedule attack
        // this.filterNode1.frequency.linearRampToValueAtTime(frequency, now + 0.1);
        // this.filterNode2.frequency.linearRampToValueAtTime(frequency, now + 0.1);
        // this.filterNode3.frequency.linearRampToValueAtTime(frequency, now + 0.1);
        // this.filterNode4.frequency.linearRampToValueAtTime(frequency, now + 0.1);

        this.filterNode1.frequency.value = frequency * 2;
        this.filterNode2.frequency.value = frequency * 2;
        this.filterNode3.frequency.value = frequency * 2;
        this.filterNode4.frequency.value = frequency * 2;

        // schedule decay
        this.gainNode.gain.exponentialRampToValueAtTime(velocity, now + 0.5);

        this.filterNode1.frequency.exponentialRampToValueAtTime(frequency / 16, now + 0.1);
        this.filterNode2.frequency.exponentialRampToValueAtTime(frequency / 16, now + 0.1);
        this.filterNode3.frequency.exponentialRampToValueAtTime(frequency / 16, now + 0.1);
        this.filterNode4.frequency.exponentialRampToValueAtTime(frequency / 16, now + 0.1);

    }

    resetOscillator() {
        this.oscillator?.stop();
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = "sawtooth";
        this.oscillator.connect(this.filterNode1);
        this.oscillator.start();
        this.gainNode.gain.value = 0;

        // just to make ts happy
        return this.oscillator;
    }

    scheduleEnd(now: number, endTimeSeconds: number) {
        if (typeof endTimeSeconds !== "number") throw new Error("endTimeSeconds is not a number");

        console.log("end in", endTimeSeconds - now);

        this.gainNode.gain.linearRampToValueAtTime(0, endTimeSeconds + 0.3);

        this.filterNode1.frequency.cancelScheduledValues(0);
        this.filterNode2.frequency.cancelScheduledValues(0);
        this.filterNode3.frequency.cancelScheduledValues(0);
        this.filterNode4.frequency.cancelScheduledValues(0);


        setTimeout(() => {
            this.inUse = false;
        }, endTimeSeconds * 1000 + 200);
    }
}
export class BassicSynth extends Synth {
    constructor() {
        super((audioContext, destination) => new BassicVoice(audioContext, destination));
    }
}
export default BassicSynth;