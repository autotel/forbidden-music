import { SynthInstance, SynthParam } from "./SynthInterface";
import { createMaximizerWorklet } from "../functions/maximizerWorkletFactory";

class SineVoice {
    inUse: boolean = false;
    triggerAttackRelease: (frequency: number, duration: number, relativeNoteStart: number, velocity: number) => void;
    triggerPerc: (frequency: number, relativeNoteStart: number, velocity: number) => void;
    stop: () => void;
    outputNode: any;
    constructor(audioContext: AudioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        this.outputNode = gainNode;
        oscillator.connect(gainNode);
        oscillator.start();

        const releaseVoice = () => {
            gainNode.gain.cancelScheduledValues(0);
            gainNode.gain.value = 0;
            this.inUse = false;

        }

        this.triggerAttackRelease = (
            frequency: number,
            duration: number,
            relativeNoteStart: number,
            velocity: number
        ) => {
            this.inUse = true;
            gainNode.gain.cancelScheduledValues(0);
            gainNode.gain.value = 0;
            gainNode.gain.linearRampToValueAtTime(velocity, audioContext.currentTime + duration / 4);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
            oscillator.frequency.value = frequency;
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + relativeNoteStart);
            setTimeout(() => {
                releaseVoice();
            }, duration * 1000);
        };

        this.triggerPerc = (
            frequency: number,
            relativeNoteStart: number,
            velocity: number
        ) => {
            this.inUse = true;
            gainNode.gain.cancelScheduledValues(0);
            gainNode.gain.value = velocity;
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 3);
            oscillator.frequency.value = frequency;
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + relativeNoteStart);
            setTimeout(() => {
                releaseVoice();
            }, 3000);

        }

        this.stop = () => {
            releaseVoice();
        };
    }
}


export class SineSynth implements SynthInstance {
    private audioContext: AudioContext;
    private voices: SineVoice[] = [];
    private outputNode?: GainNode;
    credits: string = "";
    name: string = "sine";
    enable: () => void;
    disable: () => void;
    constructor(
        audioContext: AudioContext,
        name?: string,
        credits?: string
    ) {
        this.audioContext = audioContext;

        this.voices.forEach((voice) => {
            voice.outputNode.connect(this.outputNode);
        });
        if (credits) this.credits = credits;
        if (name) this.name = name;


        (async () => {
            this.outputNode = audioContext.createGain();
            const maximizer = await createMaximizerWorklet(audioContext);
            this.outputNode.connect(maximizer);
            maximizer.connect(audioContext.destination);
        })()

        this.enable = () => {}
        this.disable = () => {}

    }
    triggerAttackRelease = (
        frequency: number,
        duration: number,
        relativeNoteStart: number,
        velocity: number
    ) => {
        let voice = this.voices.find((voice) => {
            return !voice.inUse;
        });
        if (!voice) {
            const voiceIndex = this.voices.length;
            this.voices.push(new SineVoice(this.audioContext));
            voice = this.voices[voiceIndex];
            console.log("polyphony increased to", this.voices.length);
            voice.outputNode.connect(this.outputNode);

        }
        voice.triggerAttackRelease(frequency, duration, relativeNoteStart, velocity);
    };
    triggerPerc = (frequency: number, relativeNoteStart: number, velocity: number) => {
        let voice = this.voices.find((voice) => {
            return !voice.inUse;
        });
        if (!voice) {
            const voiceIndex = this.voices.length;
            this.voices.push(new SineVoice(this.audioContext));
            voice = this.voices[voiceIndex];
            console.log("polyphony increased to", this.voices.length);
            voice.outputNode.connect(this.outputNode);

        }
        voice.triggerPerc(frequency, relativeNoteStart, velocity);

    };
    releaseAll = () => {
        this.voices.forEach((voice) => {
            voice.stop();
        });
    }
    params = [] as SynthParam[];
}
