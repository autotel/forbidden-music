import { NumberSynthParam, ParamType, SynthInstance, SynthParam } from "./SynthInterface";
import { createMaximizerWorklet } from "../functions/maximizerWorkletFactory";
import { frequencyToOctave } from "../functions/toneConverters";

export class ClusterSineVoice {
    inUse: boolean = false;
    triggerAttackRelease: (frequency: number, duration: number, relativeNoteStart: number, velocity: number) => void;
    triggerPerc: (frequency: number, relativeNoteStart: number, velocity: number) => void;
    stop: () => void;
    outputNode: any;
    relativeOctaves = [-1.2, -0.6, 0, 0.6, 1.2];
    relativeGains = [0.25, 0.5, 1, 0.5, 0.25];
    frequencyMultipliers: Map<number, number> = new Map();
    imprecision: number = 0;
    pan: number = 0;
    setValues: (relativeOctaves: number[], relativeGains: number[]) => void;

    constructor(audioContext: AudioContext) {
        const oscillators: OscillatorNode[] = [];
        const gainNode = audioContext.createGain();
        const panner = audioContext.createStereoPanner();
        gainNode.connect(panner);
        this.outputNode = panner;

        const getOrMakeOscillator = (index: number) => {
            if (oscillators[index]) return oscillators[index];
            const oscillator = audioContext.createOscillator();
            oscillator.connect(gainNode);
            oscillator.start();
            oscillators[index] = oscillator;
            return oscillator;
        }

        const getOrMakeFrequencyMultiplier = (relativeOctave: number): number => {
            if (this.frequencyMultipliers.has(relativeOctave)) return this.frequencyMultipliers.get(relativeOctave)!;
            const frequencyMultiplier = Math.pow(2, relativeOctave);
            this.frequencyMultipliers.set(relativeOctave, frequencyMultiplier);
            return frequencyMultiplier;
        }

        const forEachRelativeOctave = (callback: (
            relativeOctave: number,
            frequencyMultiplier: number,
            oscillator: OscillatorNode,
            index: number
        ) => void) => {
            this.relativeOctaves.forEach((relativeOctave, index) => {
                const oscillator = getOrMakeOscillator(index);
                const frequencyMultiplier = getOrMakeFrequencyMultiplier(relativeOctave);
                oscillator.frequency.value = 440 * relativeOctave;
                callback(relativeOctave, frequencyMultiplier, oscillator, index);
            });
        }

        const purgeUnusedOscillators = () => {
            oscillators.forEach((oscillator, index) => {
                if (this.relativeOctaves[index] === undefined) {
                    oscillator.stop();
                    delete oscillators[index];
                }
            });
        }

        this.setValues = (relativeOctaves: number[], relativeGains: number[]) => {
            this.relativeOctaves = relativeOctaves;
            this.relativeGains = relativeGains;
            purgeUnusedOscillators();
        }

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
            panner.pan.value = this.pan;
            gainNode.gain.cancelScheduledValues(absoluteStartTime);
            gainNode.gain.setValueAtTime(0, absoluteStartTime);
            gainNode.gain.linearRampToValueAtTime(velocity, absoluteStartTime + duration / 4);
            gainNode.gain.linearRampToValueAtTime(0, absoluteStartTime + duration);
            forEachRelativeOctave((relativeOctave, frequencyMultiplier, oscillator, index) => {
                const fq = frequency * frequencyMultiplier + this.imprecision * (Math.random() - 0.5);
                oscillator.frequency.setValueAtTime(fq, audioContext.currentTime + relativeNoteStart);
            });

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
            panner.pan.value = this.pan;
            const absoluteNoteStart = audioContext.currentTime + relativeNoteStart;
            gainNode.gain.cancelScheduledValues(absoluteNoteStart);
            gainNode.gain.setValueAtTime(velocity, absoluteNoteStart);
            gainNode.gain.linearRampToValueAtTime(0, absoluteNoteStart + duration);

            forEachRelativeOctave((relativeOctave, frequencyMultiplier, oscillator, index) => {
                const fq = frequency * frequencyMultiplier + this.imprecision * (Math.random() - 0.5);
                oscillator.frequency.setValueAtTime(fq, audioContext.currentTime + relativeNoteStart);
            });


            setTimeout(() => {
                releaseVoice();
            }, 3000);
        }
        this.stop = () => {
            releaseVoice();
        };
    }
}


export class ClusterSineSynth implements SynthInstance {
    private audioContext: AudioContext;
    private voices: ClusterSineVoice[] = [];
    private outputNode?: GainNode;
    credits: string = "";
    name: string = this.constructor.name.replace(/([A-Z])/g, " $1");
    enable: () => void;
    disable: () => void;

    // other cluster formulas could be thought of - this is an obvious one
    octavesInterval: number = 0.2002;
    volumeRolloff: number = 0.75;
    oscillatorsCount: number = 3;
    imprecision: number = 0;


    params = [] as SynthParam[];
    panCorrParam = {
        displayName: "octave - pan correlation",
        exportable: true,
        type: ParamType.number,
        value: 0,
        min: -1,
        max: 1,
    } as NumberSynthParam;

    memoizedCluster = {
        octavesInterval: 0,
        volumeRolloff: 0,
        oscillatorsCount: 0,
        relativeOctaves: [] as number[],
        gains: [] as number[],
    }

    octaveToPan = (octave: number) => {
        const corr = this.panCorrParam.value;
        const refOct = 3;
        const octDiff = octave - refOct;
        const pan = octDiff * corr;
        if(pan < -1) return -1;
        if(pan > 1) return 1;
        return pan;
    }

    getCluster = () => {
        if (
            this.memoizedCluster.octavesInterval === this.octavesInterval &&
            this.memoizedCluster.volumeRolloff === this.volumeRolloff &&
            this.memoizedCluster.oscillatorsCount === this.oscillatorsCount
        ) return this.memoizedCluster;
        this.memoizedCluster.relativeOctaves = [];
        this.memoizedCluster.gains = [];
        if (this.oscillatorsCount < 1) throw new Error("oscillatorsCount must be at least 1");
        const oscillatorsCount = this.oscillatorsCount;
        const volumeRolloff = this.volumeRolloff;
        const octavesInterval = this.octavesInterval;
        // 1 -> 1; 2 -> 1.5; 3->2
        const virtualCenter = (oscillatorsCount - 1) / 2;
        for (let i = 0; i < oscillatorsCount; i++) {
            const distanceFromCenter = i - virtualCenter
            const distanceFromCenterAbs = Math.abs(distanceFromCenter);
            const relativeOctave = distanceFromCenter * octavesInterval;
            const relativeGain = Math.pow(volumeRolloff, distanceFromCenterAbs);
            this.memoizedCluster.relativeOctaves[i] = relativeOctave;
            this.memoizedCluster.gains[i] = relativeGain;
        }
        this.memoizedCluster.octavesInterval = this.octavesInterval;
        this.memoizedCluster.volumeRolloff = this.volumeRolloff;
        this.memoizedCluster.oscillatorsCount = this.oscillatorsCount;
        console.log(`relativeOctaves: ${this.memoizedCluster.relativeOctaves.join(',')}; gains: ${this.memoizedCluster.gains.join(',')}`)
        return this.memoizedCluster;
    }

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

        const synth = this;
        this.params.push({
            displayName: "oscillators count",
            exportable: true,
            type: ParamType.number,
            set value(value: number) {
                synth.oscillatorsCount = Math.round(value);
            },
            get value() {
                return synth.oscillatorsCount;
            },
            min: 1,
            max: 7,
        });
        this.params.push({
            displayName: "octave interval",
            exportable: true,
            type: ParamType.number,
            set value(value: number) {
                synth.octavesInterval = value;
            },
            get value() {
                return synth.octavesInterval;
            },
            min: 0,
            max: 3,
        });
        this.params.push({
            displayName: "volume rolloff",
            exportable: true,
            type: ParamType.number,
            set value(value: number) {
                synth.volumeRolloff = value;
            },
            get value() {
                return synth.volumeRolloff;
            },
            min: 0,
            max: 1,
        });
        this.params.push({
            displayName: "imprecision",
            exportable: true,
            type: ParamType.number,
            set value(value: number) {
                synth.imprecision = value;
            },
            get value() {
                return synth.imprecision;
            },
            min: 0,
            max: 10,
        });
        this.params.push(this.panCorrParam);
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
            this.voices.push(new ClusterSineVoice(this.audioContext));
            voice = this.voices[voiceIndex];
            voice.outputNode.connect(this.outputNode);

        }
        const { relativeOctaves, gains } = this.getCluster();
        voice.setValues(relativeOctaves, gains);
        // TODO: stupid conversion back to octave, of a value which probably was converted from octave?
        voice.pan = this.octaveToPan(frequencyToOctave(frequency));
        voice.imprecision = this.imprecision;
        voice.triggerAttackRelease(frequency, duration, relativeNoteStart, velocity);
    };
    triggerPerc = (frequency: number, relativeNoteStart: number, velocity: number) => {
        let voice = this.voices.find((voice) => {
            return !voice.inUse;
        });
        if (relativeNoteStart < 0) relativeNoteStart = 0;
        if (!voice) {
            const voiceIndex = this.voices.length;
            this.voices.push(new ClusterSineVoice(this.audioContext));
            voice = this.voices[voiceIndex];
            voice.outputNode.connect(this.outputNode);

        }
        
        const { relativeOctaves, gains } = this.getCluster();
        voice.pan = this.octaveToPan(frequencyToOctave(frequency));
        voice.setValues(relativeOctaves, gains);
        voice.triggerPerc(frequency, relativeNoteStart, velocity);

    };
    releaseAll = () => {
        this.voices.forEach((voice) => {
            voice.stop();
        });
    }
}
