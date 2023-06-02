import { SynthInstance, SynthParam } from "./SynthInterface";
import { createMaximizerWorklet } from "../functions/maximizerWorkletFactory";
import { useThrottleFn } from "@vueuse/core";

const subharmonics = 4;
const frequencyMultiplier = 1
const defaultPericWaveContents = () => {

    const harmonics = 16;
    const real = []
    const imaginary = []
    for (let i = 0; i < harmonics; i++) {
        real.push(0);
        imaginary.push(0);
    }
    /*
    lol, I spent so long calculationg transposition correspoinding to subharmonics, 
    and not getting it to work. 
    it turns out that web audio api centers it around the highest value 
    */
    real[subharmonics] = 1;
    return [real, imaginary] as number[][];
}



type SimpleRef<T> = {
    value: T;
}
type NullableRef<T> = {
    value: T | null;
}

class FourierVoice {
    inUse: boolean = false;
    triggerAttackRelease: (frequency: number, duration: number, relativeNoteStart: number, velocity: number) => void;
    triggerPerc: (frequency: number, relativeNoteStart: number, velocity: number) => void;
    stop: () => void;
    outputNode: any;
    periodicWaveRef: SimpleRef<PeriodicWave>;
    constructor(audioContext: AudioContext, periodicWaveRef: SimpleRef<PeriodicWave>) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        this.outputNode = gainNode;
        oscillator.connect(gainNode);
        oscillator.start();
        this.periodicWaveRef = periodicWaveRef;
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
            oscillator.frequency.value = frequency * frequencyMultiplier;
            oscillator.setPeriodicWave(this.periodicWaveRef.value);
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
            oscillator.frequency.value = frequency * frequencyMultiplier;
            oscillator.setPeriodicWave(this.periodicWaveRef.value);
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


export class FourierSynth implements SynthInstance {
    private audioContext: AudioContext;
    private voices: FourierVoice[] = [];
    private outputNode?: GainNode;
    periodicWaveRef: NullableRef<PeriodicWave> = {
        value: null
    }
    params: SynthParam[];
    periodicWaveContents = defaultPericWaveContents();

    credits: string = "";
    name: string = "fourier";
    enable = () => {
        this.updatePeriodicWave();
    }
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

        this.enable = () => { }
        this.disable = () => { }

        this.periodicWaveRef = {
            value: audioContext.createPeriodicWave(
                new Float32Array(this.periodicWaveContents[0]),
                new Float32Array(this.periodicWaveContents[1])
            )
        }



        const parent = this;
        this.params = [{
            displayName: "levels",
            type: "nArray",
            min: -1,
            max: 1,
            set value(value: number[]) {
                parent.periodicWaveContents[0] = value;
                parent.updatePeriodicWave();
            },
            get value() {
                return parent.periodicWaveContents[0];
            }
        }, {
            displayName: "phases",
            type: "nArray",
            set value(value: number[]) {
                parent.periodicWaveContents[1] = value;
                parent.updatePeriodicWave();
            },
            get value() {
                return parent.periodicWaveContents[1];
            }
        }] as SynthParam[];

    }
    updatePeriodicWave = useThrottleFn(() => {
        if (this.periodicWaveRef.value === null) throw new Error("no periodicWave");
        const periodicWaveRef = this.periodicWaveRef as SimpleRef<PeriodicWave>;
        periodicWaveRef.value = this.audioContext.createPeriodicWave(
            new Float32Array(this.periodicWaveContents[0]),
            new Float32Array(this.periodicWaveContents[1])
        );
        console.log("periodic wave updated");
    }, 4)
    triggerAttackRelease = (
        frequency: number,
        duration: number,
        relativeNoteStart: number,
        velocity: number
    ) => {
        if (this.periodicWaveRef.value === null) throw new Error("no periodicWave");
        const periodicWaveRef = this.periodicWaveRef as SimpleRef<PeriodicWave>;
        let voice = this.voices.find((voice) => {
            return !voice.inUse;
        });
        if (!voice) {
            const voiceIndex = this.voices.length;
            this.voices.push(new FourierVoice(this.audioContext, periodicWaveRef));
            voice = this.voices[voiceIndex];
            console.log("polyphony increased to", this.voices.length);
            voice.outputNode.connect(this.outputNode);

        }
        voice.triggerAttackRelease(frequency, duration, relativeNoteStart, velocity);
    };
    triggerPerc = (frequency: number, relativeNoteStart: number, velocity: number) => {
        if (this.periodicWaveRef.value === null) throw new Error("no periodicWave");
        const periodicWaveRef = this.periodicWaveRef as SimpleRef<PeriodicWave>;
        let voice = this.voices.find((voice) => {
            return !voice.inUse;
        });
        if (!voice) {
            const voiceIndex = this.voices.length;
            this.voices.push(new FourierVoice(this.audioContext, periodicWaveRef));
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
}

interface FourierSynthParamSetter {
    periodicWave: number[][];
}