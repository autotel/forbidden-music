import { getAudioContext } from "../functions/audioContextGetter";
import { createNoiseWorklet } from "../functions/noiseWorkletFactory";
import { Voice, Synth } from "./Synth";

const workletPromise = createNoiseWorklet(getAudioContext());


class CollisionVoice implements Voice {
    inUse: boolean;
    audioContext: AudioContext;

    gainNode: GainNode;
    noise?: AudioWorkletNode;

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
        this.filterNode1.connect(this.gainNode);
        this.filterNode2.connect(this.gainNode);
        this.filterNode3.connect(this.gainNode);
        this.filterNode4.connect(this.gainNode);
        this.gainNode.connect(destination);

        workletPromise.then((noise) => {
            console.log("noise", noise);
            this.noise = noise;
            this.noise.connect(this.filterNode1);
            this.noise.connect(this.filterNode2);
            this.noise.connect(this.filterNode3);
            this.noise.connect(this.filterNode4);
            // this.noise.connect(this.gainNode);
        });

        this.filterNode1.Q.value = 2;
        this.filterNode1.frequency.value = 2000;
        this.filterNode2.Q.value = 3;
        this.filterNode2.frequency.value = 2000;
        this.filterNode3.Q.value = 2;
        this.filterNode3.frequency.value = 2000;
        this.filterNode4.Q.value = 2;
        this.filterNode4.frequency.value = 2000;

    }

    triggerAttack(now: number, frequency: number, velocity: number) {
        this.scheduleAttack(now, frequency, velocity, now);
    }

    scheduleAttack(now: number, frequency: number, velocity: number, when: number) {
        // reset stuff
        this.gainNode.gain.cancelScheduledValues(now - 0.01);

        this.filterNode1.Q.cancelScheduledValues(now - 0.01);
        this.filterNode2.Q.cancelScheduledValues(now - 0.01);
        this.filterNode3.Q.cancelScheduledValues(now - 0.01);
        this.filterNode4.Q.cancelScheduledValues(now - 0.01);

        // set note start values
        this.inUse = true;
        // redundant to ensure no negative values after exponential ramp
        this.gainNode.gain.value = velocity;
        this.gainNode.gain.setValueAtTime(velocity, now - 0.01);

        // schedule attack
        // this.filterNode1.frequency.linearRampToValueAtTime(frequency, now + 0.1);
        // this.filterNode2.frequency.linearRampToValueAtTime(frequency, now + 0.1);
        // this.filterNode3.frequency.linearRampToValueAtTime(frequency, now + 0.1);
        // this.filterNode4.frequency.linearRampToValueAtTime(frequency, now + 0.1);

        this.filterNode1.frequency.value = frequency * 16;
        this.filterNode2.frequency.value = frequency;
        this.filterNode3.frequency.value = frequency * 8;
        this.filterNode4.frequency.value = frequency / 8;

        // schedule decay
        this.gainNode.gain.exponentialRampToValueAtTime(velocity * 0.1, now + 0.5);

        this.filterNode1.Q.exponentialRampToValueAtTime(35, now + 0.01);
        this.filterNode2.Q.exponentialRampToValueAtTime(35, now + 0.01);
        this.filterNode3.Q.exponentialRampToValueAtTime(35, now + 0.01);
        this.filterNode4.Q.exponentialRampToValueAtTime(35, now + 0.01);

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

export class CollisionSynth extends Synth {
    constructor() {
        super((audioContext, destination) => new CollisionVoice(audioContext, destination));
    }
}