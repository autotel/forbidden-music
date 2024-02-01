import { NumberSynthParam, ParamType, ProgressSynthParam, ReadoutSynthParam, SynthInstance, SynthParam } from "./SynthInterface";
import { filterMap } from "../functions/filterMap";
import { createArrayOf, createFilteredArrayOf } from "../functions/createArrayOf";
import { as } from "vitest/dist/reporters-5f784f42";
interface SampleFileDefinition {
    name: string;
    frequency: number;
    velocity?: number;
    path: string;
}

interface GrainRealtimeParams {
    fadeInTime: number;
    sustainTime: number;
    fadeOutTime: number;
    grainsPerSecond: number;
    sampleOffsetTime: number;
}
interface GrainTriggerParams {
    frequency: number;
    duration: number;
    absoluteStartTime: number;
    velocity: number;
}

interface SoundGrain {
    output: AudioNode;
    /**
     * @param sampleStartTime - time within the sample where to jump at the start of the playback, in seconds
     * @param scheduleTime - time when to start the playback
     * @param targetFrequency - desired perceived frequency of the sound grain
     * @param params - asr envelope for the grain
     */
    play: (
        sampleStartTime: number,
        scheduleTime: number,
        targetFrequency: number,
        params: GrainRealtimeParams
    ) => void;
    destroy: () => void;
}

/**
 * @param audioContext - audio context
 * @param sampleBuffer - buffer of the sample to be used as a source for the sound grain
 * @param inherentFrequency Frequency inherent to the sampleBuffer. It's used to calculate the playback rate of the buffer source in order to get a desired frequency.
 */
const getSoundGrain = (
    audioContext: AudioContext,
    sampleBuffer: AudioBuffer,
    inherentFrequency: number
): SoundGrain => {
    const bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = sampleBuffer;
    const gainNode = audioContext.createGain();
    bufferSource.connect(gainNode);
    gainNode.gain.value = 0;
    return {
        output: gainNode,
        play(sampleStartTime: number, scheduleTime: number, targetFrequency: number, params: GrainRealtimeParams) {
            bufferSource.playbackRate.value = targetFrequency / inherentFrequency;

            const interval1 = params.fadeInTime;
            const interval2 = interval1 + params.sustainTime;
            const interval3 = interval2 + params.fadeOutTime;

            bufferSource.start(scheduleTime, sampleStartTime, interval3);
            gainNode.gain.setValueAtTime(0, scheduleTime);
            gainNode.gain.linearRampToValueAtTime(1, scheduleTime + interval1);
            gainNode.gain.linearRampToValueAtTime(1, scheduleTime + interval2);
            gainNode.gain.linearRampToValueAtTime(0, scheduleTime + interval3);

            bufferSource.addEventListener('ended', this.destroy);
        },
        destroy() {
            bufferSource.stop();
            bufferSource.disconnect();
            gainNode.disconnect();
            bufferSource.removeEventListener('ended', this.destroy);
        }
    };
}

type DamnTimerType = ReturnType<typeof setTimeout> | NodeJS.Timeout | number;

/**
 * it would be possible to schedule all the grain start and end points at the start of the
 * trigger event. However, being able to tweak a parameter mid-note is appreciated, which
 * is why the notes are scheduled at small time intervals, using the latest parameter values.
 */
class GranulatedScheduler<TP extends { [key: string]: any, absoluteStartTime: number, duration: number }> {


    private currentTimer: false | DamnTimerType = false;
    /** in seconds */
    frameLength: number = 0.1;
    start: (triggerparams: TP) => void;
    stop: () => void;
    constructor(audioContext: AudioContext, schedulingFunction: (triggerParams: TP, frameStartTime: number, frameEndTime: number) => void) {
        let isRunning = false;
        let nextFrameStartTime = 0;
        let endsAt = 0;


        this.start = (triggerparams: TP) => {
            this.stop();
            nextFrameStartTime = triggerparams.absoluteStartTime;
            endsAt = triggerparams.absoluteStartTime + triggerparams.duration;
            isRunning = true;
            frameFunction(triggerparams);
        }

        this.stop = () => {
            isRunning = false;
            clearTimeout(this.currentTimer as DamnTimerType);
        }

        const frameFunction = (triggerparams: TP) => {
            if (!isRunning) return;
            const currentFrameStart = nextFrameStartTime;
            nextFrameStartTime += this.frameLength;
            if(nextFrameStartTime > endsAt) {
                nextFrameStartTime = endsAt;
            }
            schedulingFunction(triggerparams, currentFrameStart, nextFrameStartTime);

            if (nextFrameStartTime >= endsAt) {
                this.stop();
                return;
            }

            const interval = (nextFrameStartTime - audioContext.currentTime) * 1000;
            console.log("interval", interval);
            this.currentTimer = setTimeout(frameFunction, interval, triggerparams);
        }
    }
}

class GranularSamplerVoice {
    inUse: boolean = false;
    sampleSource: SampleSource;
    outputNode: GainNode;
    audioContext: AudioContext;
    params: GrainRealtimeParams;
    myScheduler: GranulatedScheduler<GrainTriggerParams>;

    trigger: (
        frequency: number,
        duration: number,
        absoluteStartTime: number,
        velocity: number,
        noteStartedTimeAgo: number
    ) => void;

    constructor(audioContext: AudioContext, sampleSource: SampleSource, params: GrainRealtimeParams) {
        this.audioContext = audioContext;
        this.outputNode = this.audioContext.createGain();
        this.outputNode.gain.value = 0.5;
        this.sampleSource = sampleSource;
        this.params = params;
        let latestGrainStartTime = 0;
        this.myScheduler = new GranulatedScheduler(audioContext, (triggerParams, frameStartTime, frameEndTime) => {
            const {
                grainsPerSecond,
                sampleOffsetTime,
            } = params;

            const {
                frequency,
                duration,
                absoluteStartTime,
            } = triggerParams;

            const frameDuration = frameEndTime - frameStartTime;
            const grainInterval = 1 / grainsPerSecond;
            let iterNum = 0;

            if (!this.sampleSource?.sampleBuffer) return;

            for (let time = latestGrainStartTime; time < frameEndTime; time += grainInterval) {
                const grain = getSoundGrain(
                    this.audioContext,
                    this.sampleSource.sampleBuffer,
                    this.sampleSource.sampleInherentFrequency
                );
                if(time <= latestGrainStartTime) continue;
                latestGrainStartTime = time;
                grain.play(
                    sampleOffsetTime,
                    latestGrainStartTime,
                    frequency,
                    this.params
                );
                
                grain.output.connect(this.outputNode);
                iterNum++;
            }

        });


        this.trigger = (
            frequency: number,
            duration: number,
            absoluteStartTime: number,
            velocity: number,
            noteStartedTimeAgo: number = 0,
        ) => {
            if (this.inUse) throw new Error("Polyphony fail: voice already in use");
            this.inUse = true;
            const trigParams = {
                frequency,
                duration,
                absoluteStartTime,
                velocity,
            }
            latestGrainStartTime = absoluteStartTime;
            this.myScheduler.start(trigParams);
        };

    }


    stop = () => {
        this.myScheduler.stop();
    };

}

class SampleSource {
    private audioContext: AudioContext;
    sampleBuffer?: AudioBuffer;
    sampleInherentFrequency: number;
    sampleInherentVelocity?: number;
    isLoaded: boolean = false;
    isLoading: boolean = false;

    load = async () => {
        console.error("samplesource constructed wrong");
    };

    constructor(audioContext: AudioContext, sampleDefinition: SampleFileDefinition) {
        this.audioContext = audioContext;
        this.sampleInherentFrequency = sampleDefinition.frequency;
        if ('velocity' in sampleDefinition) {
            this.sampleInherentVelocity = sampleDefinition.velocity;
        }

        this.load = async () => {

            if (this.isLoaded || this.isLoading) throw new Error("redundant load call");
            this.isLoading = true;
            // const fetchHeaders = new Headers();
            const response = await fetch(sampleDefinition.path, {
                cache: "default",
            })
            console.groupCollapsed("header: " + sampleDefinition.path);
            response.headers.forEach((value, key) => {
                if (key.match('date')) {
                    console.log("loaded:", (Date.now() - Date.parse(value)) / 1000 / 60, " minutes ago");
                } else if (key.match('cache-control')) {
                    console.log(key + ":", value);
                }
            });
            console.groupEnd();
            const arrayBuffer = await response.arrayBuffer();
            this.sampleBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.isLoaded = true;
            this.isLoading = false;
        }
    }
}

const createParameters = (sampler: GranularSampler) => {

    sampler.params.push({
        displayName: "Level",
        type: ParamType.number,
        min: 0, max: 4,
        get value() {
            if (!sampler.outputNode) {
                console.warn("output node not set");
                return 1;
            }
            return sampler.outputNode.gain.value;
        },
        set value(value: number) {
            if (!sampler.outputNode) return;
            sampler.outputNode.gain.value = value;
        },
        exportable: true,
    } as SynthParam);

    sampler.params.push({
        displayName: "Loading progress",
        type: ParamType.progress,
        min: 0, max: 1,
        get value() {
            return sampler.loadingProgress;
        },
        exportable: false,
    } as ProgressSynthParam);

    const grainsReadout = {
        displayName: "Potential load",
        type: ParamType.readout,
        value: "--",
        exportable: false,
    } as ReadoutSynthParam;

    sampler.params.push(grainsReadout);

    const grainsPerSecond = {
        displayName: "Grains per second",
        type: ParamType.number,
        min: 1, max: 100,
        get value() {
            return sampler.voiceParams.grainsPerSecond;
        },
        set value(value: number) {
            sampler.voiceParams.grainsPerSecond = value;
            recalcGrainsReadout();
        },
        exportable: true,
    } as NumberSynthParam

    sampler.params.push(grainsPerSecond);

    const grainsFadeTime = {
        displayName: "Grain fade time",
        type: ParamType.number,
        min: 0, max: 2,
        get value() {
            return sampler.voiceParams.fadeInTime;
        },
        set value(value: number) {
            sampler.voiceParams.fadeInTime = value;
            sampler.voiceParams.fadeOutTime = value;
            recalcGrainsReadout();
        },
        exportable: true,
    } as NumberSynthParam
    sampler.params.push(grainsFadeTime);


    const grainsSustainTime = {
        displayName: "Grain sustain time",
        type: ParamType.number,
        min: 0, max: 2,
        get value() {
            return sampler.voiceParams.sustainTime;
        },
        set value(value: number) {
            sampler.voiceParams.sustainTime = value;
            recalcGrainsReadout();
        },
        exportable: true,
    } as NumberSynthParam
    sampler.params.push(grainsSustainTime);

    const relativeSampleStartTime = {
        displayName: "Sample start position",
        type: ParamType.number,
        _value: 0,
        min: 0, max: 1,
        get value() {
            return this._value;
        },
        set value(value: number) {
            this._value = value;
            if (sampler.sampleSource?.sampleBuffer) {
                sampler.voiceParams.sampleOffsetTime = value * sampler.sampleSource.sampleBuffer.duration;
            }
        },
        exportable: true,
    } as NumberSynthParam

    const recalcGrainsReadout = () => {
        const overallDuration = sampler.voiceParams.fadeInTime + sampler.voiceParams.sustainTime + sampler.voiceParams.fadeOutTime;
        const grainsPerSecond = sampler.voiceParams.grainsPerSecond;
        const potentialGrains = overallDuration * grainsPerSecond;
        if (potentialGrains > 30) {
            grainsReadout.value = potentialGrains.toFixed(2) + "!!!!";
        } else {
            grainsReadout.value = potentialGrains.toFixed(2) + " grains per voice";
        }
    }

    sampler.params.push(relativeSampleStartTime);

    return {
        relativeSampleStartTime,
        grainsReadout,
    };
}

export class GranularSampler implements SynthInstance {
    private audioContext: AudioContext;
    private sampleVoices: GranularSamplerVoice[] = [];
    sampleSource: SampleSource;
    outputNode: GainNode;
    voiceParams: GrainRealtimeParams = {
        fadeInTime: 0.5,
        sustainTime: 0,
        fadeOutTime: 0.5,
        grainsPerSecond: 10,
        sampleOffsetTime: 0.2,
    };
    loadingProgress = 0;
    credits: string = "";
    name: string = "Granular Sampler";
    enable: () => void;
    disable: () => void;
    constructor(
        audioContext: AudioContext,
        sampleDefinition: SampleFileDefinition,
        name?: string,
        credits?: string
    ) {
        this.audioContext = audioContext;
        this.sampleSource = new SampleSource(audioContext, sampleDefinition);

        this.outputNode = this.audioContext.createGain();
        this.outputNode.gain.value = 0.3;
        this.sampleVoices.forEach((sampleVoice) => {
            sampleVoice.outputNode.connect(this.outputNode);
        });
        if (credits) this.credits = credits;
        if (name) this.name = name;

        const {
            relativeSampleStartTime,
            grainsReadout,
        } = createParameters(this);

        this.enable = async () => {
            const { sampleSource } = this;
            if (sampleSource.isLoading || sampleSource.isLoaded) return;
            await sampleSource.load();
            this.loadingProgress += 1;
            if (!sampleSource.sampleBuffer) throw new Error("sample buffer load failed");
            this.voiceParams.sampleOffsetTime = relativeSampleStartTime.value * sampleSource.sampleBuffer.duration;
        }
        this.disable = () => {
        }

    }
    triggerAttackRelease = (
        frequency: number,
        duration: number,
        absoluteStartTime: number,
        velocity: number,
        noteStartedTimeAgo: number = 0
    ) => {
        let sampleVoice = this.sampleVoices.find((sampleVoice) => {
            return !sampleVoice.inUse;
        });
        if (!sampleVoice) {
            const sampleVoiceIndex = this.sampleVoices.length;
            this.sampleVoices.push(new GranularSamplerVoice(this.audioContext, this.sampleSource, this.voiceParams));
            sampleVoice = this.sampleVoices[sampleVoiceIndex];
            sampleVoice.outputNode.connect(this.outputNode);

        }
        sampleVoice.trigger(
            frequency,
            duration,
            absoluteStartTime,
            velocity,
            noteStartedTimeAgo
        );
    };
    triggerPerc = (
        frequency: number,
        absoluteStartTime: number,
        velocity: number,
        noteStartedTimeAgo: number = 0
    ) => {
        this.triggerAttackRelease(frequency, 0.1, absoluteStartTime, velocity, noteStartedTimeAgo);
    };
    releaseAll = () => {
        this.sampleVoices.forEach((sampleVoice) => {
            sampleVoice.stop();
        });
    }
    params = [] as SynthParam[];
}
