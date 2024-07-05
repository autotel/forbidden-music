import { createMaximizerWorklet } from "../../functions/maximizerWorkletFactory";
import { AutomatableSynthParam, getTweenSlice } from "../types/Automatable";
import { ParamType, NumberSynthParam, SynthParam } from "../types/SynthParam";
import { EventParamsBase, Synth } from "../types/Synth";


type ClusterSineNoteParams = EventParamsBase & {
    relativeOctaves: number[],
    relativeGains: number[],
    perc: boolean,
}

const sineVoice = (audioContext: AudioContext) => {

    const oscillators = [] as OscillatorNode[];
    const gainNode = audioContext.createGain();
    let noteStarted = 0;
    let noteVelocity = 0;
    let currentStopTimeout: ReturnType<typeof setTimeout> | undefined;

    let relativeOctaves = [-1.2, -0.6, 0, 0.6, 1.2];
    let relativeGains = [0.25, 0.5, 1, 0.5, 0.25]; // ???
    let frequencyMultipliers = new Map() as Map<number, number>;

    const getOrMakeOscillator = (index: number) => {
        if (oscillators[index]) return oscillators[index];
        const oscillator = audioContext.createOscillator();
        oscillator.connect(gainNode);
        oscillator.start();
        oscillators[index] = oscillator;
        return oscillator;
    }

    const getOrMakeFrequencyMultiplier = (relativeOctave: number): number => {
        if (frequencyMultipliers.has(relativeOctave)) {
            return frequencyMultipliers.get(relativeOctave)!;
        }
        const frequencyMultiplier = Math.pow(2, relativeOctave);
        frequencyMultipliers.set(relativeOctave, frequencyMultiplier);
        return frequencyMultiplier;
    }

    const forEachRelativeOctave = (callback: (
        relativeOctave: number,
        frequencyMultiplier: number,
        oscillator: OscillatorNode,
        index: number
    ) => void) => {
        relativeOctaves.forEach((relativeOctave, index) => {
            const oscillator = getOrMakeOscillator(index);
            const frequencyMultiplier = getOrMakeFrequencyMultiplier(relativeOctave);
            oscillator.frequency.value = 440 * relativeOctave;
            callback(relativeOctave, frequencyMultiplier, oscillator, index);
        });
    }

    const purgeUnusedOscillators = () => {
        oscillators.forEach((oscillator, index) => {
            if (relativeOctaves[index] === undefined) {
                oscillator.stop();
                delete oscillators[index];
            }
        });
    }

    return {
        inUse: false,
        output: gainNode,
        imprecision: 0 as number,
        pan: 0 as number,

        setValues: (ro: number[], rg: number[]) => {
            relativeOctaves = ro;
            relativeGains = rg;
            purgeUnusedOscillators();
        },

        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            params: ClusterSineNoteParams
        ) {
            if (currentStopTimeout) {
                clearTimeout(currentStopTimeout);
                currentStopTimeout = undefined;
            }
            noteVelocity = params.velocity;
            this.inUse = true;
            gainNode.gain.cancelScheduledValues(absoluteStartTime);
            const { relativeOctaves, relativeGains } = params;
            this.setValues(relativeOctaves, relativeGains);
            // this synth is strange in the sense that the peak volume is 
            // scheduled in relation to the note duration
            gainNode.gain.setValueAtTime(0, absoluteStartTime);
            forEachRelativeOctave((relativeOctave, frequencyMultiplier, oscillator, index) => {
                const fq = frequency * frequencyMultiplier + frequency * this.imprecision * (Math.random() - 0.5);
                oscillator.frequency.setValueAtTime(fq, absoluteStartTime);
            });
            noteStarted = absoluteStartTime;
            if (params.perc) {
                gainNode.gain.setValueAtTime(
                    noteVelocity, absoluteStartTime
                );
            }
            return this;
        },
        scheduleEnd(absoluteEndTime?: number) {
            if(absoluteEndTime) {
                const noteDuration = absoluteEndTime - noteStarted;
                gainNode.gain.cancelScheduledValues(absoluteEndTime);
                gainNode.gain.linearRampToValueAtTime(noteVelocity, noteStarted + noteDuration / 4);
                // firefox has a bit of a hard time with this stuff
                gainNode.gain.linearRampToValueAtTime(0, absoluteEndTime);
                currentStopTimeout = setTimeout(() => {
                    this.releaseVoice();
                }, (absoluteEndTime - audioContext.currentTime) * 1000 + 10);
            }else{
                this.releaseVoice();
            }
            return this;
        },
        stop() {
            const now = audioContext.currentTime;
            this.scheduleEnd(now);
        },
        releaseVoice() {
            gainNode.gain.cancelScheduledValues(audioContext.currentTime);
            // firefox has a bit of a hard time with this stuff
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.value = 0;
            this.inUse = false;
            currentStopTimeout = undefined;
        }
    };

};


const buildParams = (synth: SineCluster) => {

    synth.params.push({
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

    const octavesIntervalParam: AutomatableSynthParam = {
        displayName: "octave interval",
        _v: 0.2002,
        exportable: true,
        type: ParamType.number,
        set value(value: number) {
            this._v = value;
        },
        get value() {
            return this._v;
        },
        min: 0,
        max: 3,
        updateValue(time: number) {
            const tweenSlice = getTweenSlice(this, time);
            this._v = tweenSlice.value;
        },
        animate(startTime: number, destTime: number, destValue: number) {
        },
        stopAnimations() {
        }
    }

    synth.params.push(octavesIntervalParam);

    synth.params.push({
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

    synth.params.push({
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
        max: 1,
    });
    return {
        octavesIntervalParam
    }
}
type ClusterSineVoice = ReturnType<typeof sineVoice>;

export class SineCluster extends Synth<EventParamsBase, ClusterSineVoice> {
    voices: ClusterSineVoice[] = [];
    credits = "Simple sine synth by Autotel";

    volumeRolloff: number = 0.75;
    oscillatorsCount: number = 3;
    imprecision: number = 0;
    octavesInterval: AutomatableSynthParam;

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
        if (pan < -1) return -1;
        if (pan > 1) return 1;
        return pan;
    }

    getCluster = (atTime: number) => {
        this.octavesInterval.updateValue(atTime);
        const octavesInterval = this.octavesInterval.value;
        if (
            this.memoizedCluster.octavesInterval === octavesInterval &&
            this.memoizedCluster.volumeRolloff === this.volumeRolloff &&
            this.memoizedCluster.oscillatorsCount === this.oscillatorsCount
        ) return this.memoizedCluster;
        this.memoizedCluster.relativeOctaves = [];
        this.memoizedCluster.gains = [];
        if (this.oscillatorsCount < 1) throw new Error("oscillatorsCount must be at least 1");
        const oscillatorsCount = this.oscillatorsCount;
        const volumeRolloff = this.volumeRolloff;
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
        this.memoizedCluster.octavesInterval = octavesInterval;
        this.memoizedCluster.volumeRolloff = this.volumeRolloff;
        this.memoizedCluster.oscillatorsCount = this.oscillatorsCount;
        return this.memoizedCluster;
    }

    constructor(
        audioContext: AudioContext,
    ) {
        super(audioContext, sineVoice);
        this.output.gain.value = 0.1;
        let maximizer: AudioNode | undefined;
        this.transformTriggerParams = (params: EventParamsBase) => {
            const { relativeOctaves, gains } = this.getCluster(audioContext.currentTime);
            params.relativeOctaves = relativeOctaves;
            params.relativeGains = gains;
            return {
                ...params,
                relativeOctaves,
                relativeGains: gains,
                // perc: false,
            } as ClusterSineNoteParams;
        }

        this.enable = async () => {
            if (!maximizer) {
                // TODO: fix how FX work and move maximizer out of here
                maximizer = await createMaximizerWorklet(audioContext);
            }
            maximizer.connect(this.output);
            this.isReady = true;
        }
        this.disable = () => {
            if (maximizer) {
                maximizer.disconnect();
            }
            this.isReady = false;
        }

        const {
            octavesIntervalParam
        } = buildParams(this);
        this.octavesInterval = octavesIntervalParam;
        this.params.push(this.panCorrParam);
    }
    params = [] as SynthParam[];
}
