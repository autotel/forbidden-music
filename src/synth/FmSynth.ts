import { Synth, Voice } from "./Synth";
import ADSREnvelope from "adsr-envelope";
// maybe use https://github.com/g200kg/audioworklet-adsrnode instead

/**
 * step 0: enveloped sine synth using adsrenvelope audioNode
 * step 1: sine wave voice with one envelope. The routing of envelope to amplitude is controllable
*/

type AudioNodeLike = {
    connect: (to: AudioNode) => {}
}



const makeConnector = (audioContext: AudioContext) => {
    const gain = audioContext.createGain();
    const val = {
        get node() {
            return gain
        },
        set value(newValue) {
            gain.gain.value = newValue;
        },
        get value() {
            return gain.gain.value
        }
    }
    return val;
}

class FmVoice implements Voice {

    inUse: boolean;
    audioContext: AudioContext;
    gainNode: GainNode;


    oscillator: OscillatorNode;
    envA: ADSREnvelope
    startTime: number;

    triggerAttack(frequency: number, playbackTime = this.audioContext.currentTime) {
        console.log("trigger attachk", frequency);
        this.oscillator.frequency.value = frequency;
        this.startTime = playbackTime;
        this.envA.gateTime = Infinity;
        this.envA.applyTo(this.gainNode.gain, playbackTime);
        this.oscillator.start(playbackTime);
        this.inUse = true;
    }

    scheduleAttack (frequency: number, velocity: number, when?: number, now?: number) {
        this.triggerAttack(frequency, when);
    }

    scheduleEnd(endTimeSeconds: number = 0, playbackTime = this.audioContext.currentTime) {
        this.gainNode.gain.cancelScheduledValues(this.startTime);
        this.envA.gateTime = playbackTime - this.startTime;
        this.envA.applyTo(this.gainNode.gain, this.startTime);
        this.oscillator.stop(this.startTime + this.envA.duration);
        // to-do: prevent repetition of this timeout by clear timeout
        setTimeout(() => {
            this.inUse = false;
            this.resetOscillator();
        }, this.envA.duration * 1000);
    }

    resetOscillator = () => {
        if(this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
        }
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.connect(this.gainNode);
        return this.oscillator;
    };

    constructor(audioContext: AudioContext, destination: AudioNode) {
        this.inUse = false;
        this.audioContext = audioContext;
        this.envA = new ADSREnvelope({
            attackTime: 0.5,
            decayTime: 0.25,
            sustainLevel: 0.8,
            releaseTime: 2.5,
            gateTime: 6,
            releaseCurve: "exp",
        });

        this.startTime = 0;
        this.gainNode = audioContext.createGain();
        this.gainNode.connect(destination);
        this.oscillator = this.resetOscillator();
    }
}

export class FmSynth extends Synth {
    constructor() {
        super((audioContext, destination) => new FmVoice(audioContext, destination));
    }
}