import { os } from "@tauri-apps/api";
import { AutomatableSynthParam, getTweenSlice } from "../types/Automatable";
import { EventParamsBase, Synth, SynthVoice } from "../types/Synth";
import { BooleanSynthParam, NumberSynthParam, ParamType, SynthParam } from "../types/SynthParam";


type ClusterSineNoteParams = EventParamsBase & {
    relativeOctaves: number[],
    relativeGains: number[],
    perc: boolean,
}
type ClusterSineVoice = SynthVoice & {
    scheduleStart: (frequency: number, absoluteStartTime: number, params: ClusterSineNoteParams) => ClusterSineVoice,
    scheduleEnd: (absoluteEndTime?: number) => ClusterSineVoice,
    stop: () => void,
    releaseVoice: () => void,
}

const sineVoice = (audioContext: AudioContext, synth: SineCluster): ClusterSineVoice => {

    const oscillators = [] as OscillatorNode[];
    const gains = [] as GainNode[];
    const output = audioContext.createGain();
    let noteStarted = 0;
    let noteVelocity = 0;
    let currentStopTimeout: ReturnType<typeof setTimeout> | undefined;

    let relativeOctaves = [-1.2, -0.6, 0, 0.6, 1.2];
    let relativeGains = [0.25, 0.5, 1, 0.5, 0.25]; // ???
    let frequencyMultipliers = new Map() as Map<number, number>;
    let isPercussive = false;

    const rebuildOscillator = (index: number, startTime: number, gainDest:GainNode):OscillatorNode => {
        const gain = gainDest;
        const oscillator = audioContext.createOscillator();
        oscillators[index] = oscillator;
        oscillator.start(startTime);
        oscillator.connect(gain);
        return oscillator;
    }

    const getOrMakeGain = (index: number): GainNode => {
        if (gains[index]) {
            return gains[index]!;
        }
        const gain = audioContext.createGain();
        gain.gain.value = 0;
        gain.connect(output);
        gains[index] = gain;
        return gain;
    }

    const getOrMakeOscillator = (
        index: number, 
        startTime:number
    ): [OscillatorNode, GainNode] => {
        let oscillator: OscillatorNode;
        let gain = getOrMakeGain(index);
        if (oscillators[index]) {
            oscillator = oscillators[index];
            if(synth.restartPhases.value) {
                oscillator.stop();
                oscillator.disconnect();
                oscillator = rebuildOscillator(index, startTime, gain);
            }
        } else {
            oscillator = rebuildOscillator(index, startTime, gain);
        }
        gain.gain.value = 0;
        return [oscillator, gain];
    }

    const getOrMakeFrequencyMultiplier = (relativeOctave: number): number => {
        if (frequencyMultipliers.has(relativeOctave)) {
            return frequencyMultipliers.get(relativeOctave)!;
        }
        const frequencyMultiplier = Math.pow(2, relativeOctave);
        frequencyMultipliers.set(relativeOctave, frequencyMultiplier);
        return frequencyMultiplier;
    }

    const purgeUnused = () => {
        oscillators.forEach((oscillator, index) => { 
            if (relativeOctaves[index] === undefined) {
                oscillator.stop();
                oscillator.disconnect();
                delete oscillators[index];
            }
        });
    }

    return {
        inUse: false,
        output,
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
            isPercussive = params.perc;
            let imprecision = synth.imprecision;

            this.inUse = true;
            output.gain.cancelScheduledValues(absoluteStartTime);
            output.gain.setValueAtTime(0, absoluteStartTime);
            relativeGains = params.relativeGains;
            relativeOctaves = params.relativeOctaves;


            if (isPercussive) {
                if (synth.percAttackTimeParam.value) {
                    output.gain.linearRampToValueAtTime(
                        noteVelocity,
                        absoluteStartTime + synth.percAttackTimeParam.value
                    );
                } else {
                    output.gain.setValueAtTime(
                        noteVelocity, absoluteStartTime
                    );
                }
            }

            relativeOctaves.forEach((relativeOctave, index) => {
                const [oscillator, gain] = getOrMakeOscillator(index, absoluteStartTime);
                const frequencyMultiplier = getOrMakeFrequencyMultiplier(relativeOctave);
                gain.gain.setValueAtTime(relativeGains[index], absoluteStartTime);
                oscillator.frequency.value = 440 * relativeOctave;
                const fq = frequency * frequencyMultiplier + frequency * imprecision * (Math.random() - 0.5) ;
                oscillator.frequency.setValueAtTime(fq, absoluteStartTime);
            });

            purgeUnused();

            noteStarted = absoluteStartTime;

            return this;
        },

        scheduleEnd(absoluteEndTime?: number) {
            if (absoluteEndTime) {
                const noteDuration = absoluteEndTime - noteStarted;
                output.gain.cancelScheduledValues(absoluteEndTime);

                if(!isPercussive) {
                    output.gain.linearRampToValueAtTime(noteVelocity, noteStarted + noteDuration / 4);
                }

                output.gain.linearRampToValueAtTime(0, absoluteEndTime);
                if(currentStopTimeout) {
                    clearTimeout(currentStopTimeout);
                }
                currentStopTimeout = setTimeout(() => {
                    this.releaseVoice();
                }, (absoluteEndTime + synth.percAttackTimeParam.value - audioContext.currentTime) * 1000 + 1000);
            } else {
                // it should happen only on playback stop anyway
                this.scheduleEnd(audioContext.currentTime + synth.percAttackTimeParam.value + 0.1);
            }
            return this;
        },
        stop() {
            const now = audioContext.currentTime;
            this.scheduleEnd(now);
        },
        releaseVoice() {
            output.gain.cancelScheduledValues(audioContext.currentTime);
            output.gain.value = 0;
            oscillators.forEach(oscillator => oscillator.frequency.value=0);
            this.inUse = false;
            currentStopTimeout = undefined;
        }
    };

};


const buildParams = (synth: SineCluster) => {

    const percAttackTimeParam = {
        displayName: "Percussion Attack",
        exportable: true,
        type: ParamType.number,
        value: 0.01,
        min: 0,
        max: 0.3,
    } as NumberSynthParam;
    synth.params.push(percAttackTimeParam);

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
        octavesIntervalParam,
        percAttackTimeParam,
    }
}

export class SineCluster extends Synth<EventParamsBase, ClusterSineVoice> {
    voices: ClusterSineVoice[] = [];
    credits = "Simple sine synth by Autotel";

    volumeRolloff: number = 0.75;
    oscillatorsCount: number = 3;
    imprecision: number = 0;
    octavesInterval: AutomatableSynthParam;
    percAttackTimeParam: NumberSynthParam;
    restartPhases = {
        type: ParamType.boolean,
        value: false,
        displayName: "Restart Phases",
        exportable: true,
    }as BooleanSynthParam;

    memoizedCluster = {
        octavesInterval: 0,
        volumeRolloff: 0,
        oscillatorsCount: 0,
        relativeOctaves: [] as number[],
        gains: [] as number[],
    }

    // octaveToPan = (octave: number) => {
    //     const corr = this.panCorrParam.value;
    //     const refOct = 3;
    //     const octDiff = octave - refOct;
    //     const pan = octDiff * corr;
    //     if (pan < -1) return -1;
    //     if (pan > 1) return 1;
    //     return pan;
    // }

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
        const {
            octavesIntervalParam,
            percAttackTimeParam,
        } = buildParams(this);
        this.octavesInterval = octavesIntervalParam;
        this.percAttackTimeParam = percAttackTimeParam;
        this.params.push(this.restartPhases);
    }
    params = [] as SynthParam[];
}
