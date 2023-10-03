import { EffectInstance, SynthInstance, SynthParam } from "./SynthInterface";
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
            relativeNoteStart: number,
            velocity: number
        ) => {
            this.inUse = true;
            if (relativeNoteStart < 0) {
                duration += relativeNoteStart;
                relativeNoteStart = 0;
            }
            const absoluteStartTime = audioContext.currentTime + relativeNoteStart;
            gainNode.gain.cancelScheduledValues(absoluteStartTime);
            gainNode.gain.setValueAtTime(0, absoluteStartTime);
            gainNode.gain.linearRampToValueAtTime(velocity, absoluteStartTime + duration / 4);
            gainNode.gain.linearRampToValueAtTime(0, absoluteStartTime + duration);
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
            let duration = velocity * 2.8;
            if (relativeNoteStart < 0) {
                duration += relativeNoteStart;
                relativeNoteStart = 0;
            }
            const absoluteNoteStart = audioContext.currentTime + relativeNoteStart;
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


export class AutoMaximizerEffect implements EffectInstance {
    private audioContext: AudioContext;
    private voices: SineVoice[] = [];
    outputNode: GainNode;
    inputNode: GainNode;
    credits: string = "";
    name: string = "AutoMaximizer";
    enable: () => void;
    disable: () => void;
    constructor(
        audioContext: AudioContext,
    ) {
        this.audioContext = audioContext;
        this.credits = "maximizer worklet by autotel";

        this.outputNode = audioContext.createGain();
        this.inputNode = audioContext.createGain();
        this.inputNode.connect(this.outputNode);

        let maximizer: AudioNode | undefined;

        this.enable = async () => {
            if(!maximizer) {
                // TODO: move maximizer to an fx, and remove it from here
                maximizer = await createMaximizerWorklet(audioContext);
            }
            this.inputNode.disconnect();
            maximizer.connect(this.outputNode);
            this.inputNode.connect(maximizer);
        }
        this.disable = () => {
        }

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
        if (relativeNoteStart < 0) relativeNoteStart = 0;
        if (!voice) {
            const voiceIndex = this.voices.length;
            this.voices.push(new SineVoice(this.audioContext));
            voice = this.voices[voiceIndex];
            voice.outputNode.connect(this.outputNode);
        }
        voice.triggerAttackRelease(frequency, duration, relativeNoteStart, velocity);
    };
    triggerPerc = (frequency: number, relativeNoteStart: number, velocity: number) => {
        let voice = this.voices.find((voice) => {
            return !voice.inUse;
        });
        if (relativeNoteStart < 0) relativeNoteStart = 0;
        if (!voice) {
            const voiceIndex = this.voices.length;
            this.voices.push(new SineVoice(this.audioContext));
            voice = this.voices[voiceIndex];
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
