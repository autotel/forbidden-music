import { SynthInstance, SynthParam, SynthVoice, synthVoiceFactory } from "./SynthInterface";
import { createMaximizerWorklet } from "../functions/maximizerWorkletFactory";
import { Synth } from "./super/Synth";

type SineNoteParams = {
    velocity: number,
    att: number,
}

const sineVoice = (audioContext: AudioContext): SynthVoice<SineNoteParams> => {

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    oscillator.start();

    return {
        inUse: false,
        output: gainNode,
        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            params: SineNoteParams
        ) {
            const { velocity, att } = params;
            this.inUse = true;
            gainNode.gain.cancelScheduledValues(absoluteStartTime);
            gainNode.gain.setValueAtTime(0, absoluteStartTime);
            gainNode.gain.linearRampToValueAtTime(velocity, absoluteStartTime + att);
            oscillator.frequency.value = frequency;
            oscillator.frequency.setValueAtTime(frequency, absoluteStartTime);
            return this;
        },
        scheduleEnd(absoluteEndTime: number) {
            gainNode.gain.cancelScheduledValues(audioContext.currentTime);
            // firefox has a bit of a hard time with this stuff
            gainNode.gain.linearRampToValueAtTime(absoluteEndTime, audioContext.currentTime);
            gainNode.gain.value = 0;
            this.inUse = false;
            return this;
        },
        stop() {
            const now = audioContext.currentTime;
            this.scheduleEnd(now);
        }
    };

}

type SineVoice = ReturnType<typeof sineVoice>;

export class SineSynth extends Synth<SineVoice, SineNoteParams> {
    audioContext: AudioContext;
    voices: SineVoice[] = [];
    output: GainNode;
    credits: string = "";
    name: string = "Sine";
    enable: () => void;
    disable: () => void;
    constructor(
        audioContext: AudioContext,
        name?: string,
        credits?: string
    ) {
        super(audioContext, sineVoice);
        this.audioContext = audioContext;
        this.voices.forEach((voice) => {
            voice.output.connect(this.output);
        });
        if (credits) this.credits = credits;
        if (name) this.name = name;

        this.output = audioContext.createGain();
        this.output.gain.value = 0.1;

        let maximizer: AudioNode | undefined;

        this.enable = async () => {
            if (!maximizer) {
                // TODO: move maximizer to an fx, and remove it from here
                maximizer = await createMaximizerWorklet(audioContext);
            }
            maximizer.connect(this.output);
        }
        this.disable = () => {
            if (maximizer) {
                maximizer.disconnect();
            }
        }

    }
    scheduleStart = (
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
            voice.output.connect(this.output);

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
            voice.output.connect(this.output);

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
