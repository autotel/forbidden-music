import { SynthInstance, SynthParam } from "./SynthInterface";
import { createMaximizerWorklet } from "../functions/maximizerWorkletFactory";

export class SineVoice {
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
            gainNode.gain.cancelScheduledValues(audioContext.currentTime);
            // firefox has a bit of a hard time with this stuff
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.value = 0;
            this.inUse = false;
        }

        this.triggerAttackRelease = (
            frequency: number,
            duration: number,
            absoluteNoteStart: number,
            velocity: number
        ) => {
            this.inUse = true;
            gainNode.gain.cancelScheduledValues(absoluteNoteStart);
            gainNode.gain.setValueAtTime(0, absoluteNoteStart);
            gainNode.gain.linearRampToValueAtTime(velocity, absoluteNoteStart + duration / 4);
            gainNode.gain.linearRampToValueAtTime(0, absoluteNoteStart + duration);
            oscillator.frequency.value = frequency;
            oscillator.frequency.setValueAtTime(frequency, absoluteNoteStart);
            setTimeout(() => {
                releaseVoice();
            }, duration * 1000);
        };


        this.triggerPerc = (
            frequency: number,
            absoluteNoteStart: number,
            velocity: number
        ) => {
            this.inUse = true;
            let duration = velocity * 2.8;
            gainNode.gain.cancelScheduledValues(absoluteNoteStart);
            gainNode.gain.setValueAtTime(velocity, absoluteNoteStart);
            gainNode.gain.linearRampToValueAtTime(0, absoluteNoteStart + duration);
            oscillator.frequency.setValueAtTime(frequency, absoluteNoteStart);
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
    outputNode: GainNode;
    credits: string = "";
    name: string = "Sine";
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

        this.outputNode = audioContext.createGain();
        this.outputNode.gain.value = 0.1;
        
        let maximizer: AudioNode | undefined;

        this.enable = async () => {
            if(!maximizer) {
                // TODO: move maximizer to an fx, and remove it from here
                maximizer = await createMaximizerWorklet(audioContext);
            }
            maximizer.connect(this.outputNode);
        }
        this.disable = () => {
            if (maximizer) {
                maximizer.disconnect();
            }
        }

    }
    triggerAttackRelease = (
        frequency: number,
        duration: number,
        absoluteNoteStart: number,
        velocity: number
    ) => {
        let voice = this.voices.find((voice) => {
            return !voice.inUse;
        });
        if (!voice) {
            const voiceIndex = this.voices.length;
            this.voices.push(new SineVoice(this.audioContext));
            voice = this.voices[voiceIndex];
            voice.outputNode.connect(this.outputNode);

        }
        voice.triggerAttackRelease(frequency, duration, absoluteNoteStart, velocity);
    };
    triggerPerc = (frequency: number, absoluteNoteStart: number, velocity: number) => {
        let voice = this.voices.find((voice) => {
            return !voice.inUse;
        });
        if (!voice) {
            const voiceIndex = this.voices.length;
            this.voices.push(new SineVoice(this.audioContext));
            voice = this.voices[voiceIndex];
            voice.outputNode.connect(this.outputNode);

        }
        voice.triggerPerc(frequency, absoluteNoteStart, velocity);

    };
    releaseAll = () => {
        this.voices.forEach((voice) => {
            voice.stop();
        });
    }
    params = [] as SynthParam[];
}
