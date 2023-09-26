import { NumberSynthParam, ParamType, SynthInstance, SynthParam } from "./SynthInterface";
import { createMaximizerWorklet } from "../functions/maximizerWorkletFactory";

export class KickVoice {
    inUse: boolean = false;
    triggerAttackRelease: (frequency: number, duration: number, relativeNoteStart: number, velocity: number) => void;
    triggerPerc: (frequency: number, relativeNoteStart: number, velocity: number) => void;
    stop: () => void;
    outputNode: any;
    startOctave: number = 2;
    decayTime: number = 0.4;
    constructor(audioContext: AudioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const distortion = audioContext.createWaveShaper();
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

        const scheduleFreqEnvelope = (startTime: number, targetFrequency: number) => {
            const ot = 2 ** (this.startOctave - 1);
            oscillator.frequency.cancelScheduledValues(startTime);
            oscillator.frequency.setValueAtTime(targetFrequency * ot, startTime);
            oscillator.frequency.linearRampToValueAtTime(targetFrequency, startTime + this.decayTime);
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
            scheduleFreqEnvelope(absoluteStartTime, frequency);
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
            const absoluteStartTime = audioContext.currentTime + relativeNoteStart;
            gainNode.gain.cancelScheduledValues(absoluteStartTime);
            gainNode.gain.setValueAtTime(velocity, absoluteStartTime);
            gainNode.gain.linearRampToValueAtTime(0, absoluteStartTime + duration);
            scheduleFreqEnvelope(absoluteStartTime, frequency);
            setTimeout(() => {
                releaseVoice();
            }, 3000);
        }

        this.stop = () => {
            releaseVoice();
        };
    }
}

const PARAM_START_OCTAVE = 0;
const PARAM_DECAY_TIME = 1;

export class KickSynth implements SynthInstance {
    private audioContext: AudioContext;
    private voices: KickVoice[] = [];
    private outputNode?: GainNode;
    credits: string = "";
    name: string = "Kick";
    enable: () => void;
    disable: () => void;
    startOctaveParam: NumberSynthParam = {
        displayName: "start octave",
        type: ParamType.number,
        min: 0, max: 4,
        value: 2.273,
        exportable: true,
    }
    decayTimeParam: NumberSynthParam = {
        displayName: "decay time",
        type: ParamType.number,
        min: 0, max: 2,
        value: 0.04,
        exportable: true,
    }
    params: SynthParam[];
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

        this.params = [
            this.startOctaveParam,
            this.decayTimeParam,
        ];

        this.enable = () => { }
        this.disable = () => { }
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
            this.voices.push(new KickVoice(this.audioContext));
            voice = this.voices[voiceIndex];
            voice.outputNode.connect(this.outputNode);

        }
        voice.decayTime = this.decayTimeParam.value;
        voice.startOctave = this.startOctaveParam.value;
        voice.triggerAttackRelease(frequency, duration, relativeNoteStart, velocity);
    };

    triggerPerc = (frequency: number, relativeNoteStart: number, velocity: number) => {
        let voice = this.voices.find((voice) => {
            return !voice.inUse;
        });
        if (relativeNoteStart < 0) relativeNoteStart = 0;
        if (!voice) {
            const voiceIndex = this.voices.length;
            this.voices.push(new KickVoice(this.audioContext));
            voice = this.voices[voiceIndex];
            voice.outputNode.connect(this.outputNode);

        }
        voice.decayTime = this.decayTimeParam.value;
        voice.startOctave = this.startOctaveParam.value;
        voice.triggerPerc(frequency, relativeNoteStart, velocity);
    };

    releaseAll = () => {
        this.voices.forEach((voice) => {
            voice.stop();
        });
    }
}
