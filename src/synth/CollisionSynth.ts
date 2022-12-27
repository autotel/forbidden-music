import { getAudioContext } from "../functions/audioContextGetter";
import { createNoiseWorklet } from "../functions/noiseWorkletFactory";
import { Voice, Synth } from "./Synth";

const workletPromise = createNoiseWorklet(getAudioContext());


class CollisionVoice implements Voice {
    inUse: boolean;
    audioContext: AudioContext;

    gainNode: GainNode;
    noise: AudioWorkletNode;

    filterNodes: BiquadFilterNode[];
    filterAmps: GainNode[];

    constructor(audioContext: AudioContext, destination: AudioNode) {
        this.audioContext = audioContext;
        this.inUse = false;

        this.filterNodes = [
            audioContext.createBiquadFilter(),
            audioContext.createBiquadFilter(),
            audioContext.createBiquadFilter(),
            audioContext.createBiquadFilter(),
            audioContext.createBiquadFilter(),
            audioContext.createBiquadFilter(),
            audioContext.createBiquadFilter(),
            audioContext.createBiquadFilter(),
        ]

        this.filterAmps = this.filterNodes.map(f => audioContext.createGain());

        this.gainNode = audioContext.createGain();
        this.gainNode.connect(destination);

        workletPromise.then((noise) => {
            this.noise = noise;
            this.filterNodes.forEach((filter, i) => {
                this.noise.connect(filter);
                filter.connect(this.filterAmps[i]);
                this.filterAmps[i].connect(this.gainNode);
            });
        });


        const qvals = this.filterNodes.map((f, i) => 11 + 2 ** (5 - i));
        const ampvals = this.filterNodes.map((f, i) => 2 ** (1 - i));

        this.filterNodes.map((f, i) => f.Q.value = qvals[i]);
        this.filterAmps.map((f, i) => f.gain.value = ampvals[i]);

    }

    triggerAttack(now: number, frequency: number, velocity: number) {
        this.scheduleAttack(now, frequency, velocity, now);
    }

    scheduleAttack(now: number, frequency: number, velocity: number, when: number) {
        // reset stuff
        this.gainNode.gain.cancelScheduledValues(now - 0.01);

        this.filterNodes.forEach(f => f.frequency.cancelScheduledValues(now - 0.01));

        // set note start values
        this.inUse = true;
        // redundant to ensure no negative values after exponential ramp
        this.gainNode.gain.value = velocity;
        this.gainNode.gain.setValueAtTime(velocity, now - 0.1);

        // schedule attack
        this.filterNodes[0].frequency.value = frequency;
        this.filterNodes[1].frequency.value = frequency * 4;
        this.filterNodes[2].frequency.value = frequency * 8;
        this.filterNodes[3].frequency.value = frequency / 2;
        this.filterNodes[4].frequency.value = frequency / 4;
        this.filterNodes[5].frequency.value = frequency * 16;
        this.filterNodes[6].frequency.value = frequency + 411;
        this.filterNodes[7].frequency.value = frequency + 111;

        // this.filterNodes.forEach((f, i) => f.Q.exponentialRampToValueAtTime(qvals[i], now + 0.1));
        // schedule decay
        this.gainNode.gain.exponentialRampToValueAtTime(velocity * 0.1, now + 0.5);


    }

    scheduleEnd(now: number, endTimeSeconds: number) {
        if (typeof endTimeSeconds !== "number") throw new Error("endTimeSeconds is not a number");
        this.gainNode.gain.linearRampToValueAtTime(0, endTimeSeconds + 0.3);

        // cancel all filter scheduled values
        this.filterNodes.forEach(f => {
            f.Q.cancelScheduledValues(0);
            f.frequency.cancelScheduledValues(0)
        });

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