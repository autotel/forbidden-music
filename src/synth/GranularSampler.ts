import { Synth, SynthInterface } from "./super/Synth";
import { EventParamsBase, NumberSynthParam, ParamType, ProgressSynthParam, ReadoutSynthParam, SynthParam, SynthVoice } from "./super/SynthInterface";
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

const granularSamplerVoice = (
    audioContext: AudioContext,
    grainRealtimeParams: GrainRealtimeParams,
    sampleSource: SampleSource
): SynthVoice<EventParamsBase> => {
    const output = audioContext.createGain();
    output.gain.value = 0.5;
    let latestGrainStartTime = 0;
    let triggerFrequency: number = 0;
    let triggerVelocity: number = 0;

    const myScheduler = new Scheduler(audioContext, (_frameStartTime, frameEndTime) => {
        const {
            grainsPerSecond,
            sampleOffsetTime,
        } = grainRealtimeParams;

        const grainInterval = 1 / grainsPerSecond;
        let iterNum = 0;
        if (!sampleSource?.sampleBuffer) return;

        for (let time = latestGrainStartTime; time < frameEndTime; time += grainInterval) {
            const grain = getSoundGrain(
                audioContext,
                sampleSource.sampleBuffer,
                sampleSource.sampleInherentFrequency
            );
            if (time <= latestGrainStartTime) continue;
            latestGrainStartTime = time;
            grain.play(
                sampleOffsetTime,
                latestGrainStartTime,
                triggerFrequency,
                grainRealtimeParams
            );

            grain.output.connect(output);
            iterNum++;
        }

    });

    const stop = () => {
        myScheduler.stop();
    }

    return {
        inUse: false,
        output,
        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            { velocity },
        ) {
            triggerFrequency = frequency;
            triggerVelocity = velocity;
            if (this.inUse) throw new Error("Polyphony fail: voice already in use");
            this.inUse = true;
            latestGrainStartTime = absoluteStartTime;
            myScheduler.scheduleStart(absoluteStartTime);
            myScheduler.onStopCallback = () => {
                this.inUse = false;
            }
            return this;
        },
        scheduleEnd(absoluteStopTime: number) {
            myScheduler.scheduleStop(absoluteStopTime);
            return this;
        },
        stop,
    }
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
        play(
            sampleStartTime: number,
            scheduleTime: number,
            targetFrequency: number,
            params: GrainRealtimeParams
        ) {
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
class Scheduler {
    private currentTimer: false | DamnTimerType = false;
    /** in seconds */
    frameLength: number = 0.1;
    scheduleStart: (absoluteStartTime: number) => void;
    scheduleStop: (absoluteStopTime: number) => void;
    stop: () => void;
    onStopCallback = () => { };
    constructor(
        audioContext: AudioContext,
        schedulingFunction: (frameStartTime: number, frameEndTime: number) => void
    ) {
        let isRunning = false;
        let nextFrameStartTime = 0;
        let endsAt = Infinity;

        this.scheduleStart = (absoluteStartTime: number) => {
            this.stop();
            nextFrameStartTime = absoluteStartTime;
            endsAt = Infinity;
            isRunning = true;
            frameFunction();
        }

        this.scheduleStop = (absoluteStopTime: number) => {
            endsAt = absoluteStopTime;
        }

        this.stop = () => {
            isRunning = false;
            clearTimeout(this.currentTimer as DamnTimerType);
        }

        const frameFunction = () => {
            if (!isRunning) return;
            const currentFrameStart = nextFrameStartTime;
            nextFrameStartTime += this.frameLength;
            if (nextFrameStartTime > endsAt) {
                nextFrameStartTime = endsAt;
            }
            schedulingFunction(currentFrameStart, nextFrameStartTime);

            if (nextFrameStartTime >= endsAt) {
                this.stop();
                return;
            }

            const interval = (nextFrameStartTime - audioContext.currentTime) * 1000;
            this.currentTimer = setTimeout(frameFunction, interval);
        }
    }
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
            if (!sampler.output) {
                console.warn("output node not set");
                return 1;
            }
            return sampler.output.gain.value;
        },
        set value(value: number) {
            if (!sampler.output) return;
            sampler.output.gain.value = value;
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
            return sampler.realtimeParams.grainsPerSecond;
        },
        set value(value: number) {
            sampler.realtimeParams.grainsPerSecond = value;
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
            return sampler.realtimeParams.fadeInTime;
        },
        set value(value: number) {
            sampler.realtimeParams.fadeInTime = value;
            sampler.realtimeParams.fadeOutTime = value;
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
            return sampler.realtimeParams.sustainTime;
        },
        set value(value: number) {
            sampler.realtimeParams.sustainTime = value;
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
                sampler.realtimeParams.sampleOffsetTime = value * sampler.sampleSource.sampleBuffer.duration;
            }
        },
        exportable: true,
    } as NumberSynthParam

    const recalcGrainsReadout = () => {
        const overallDuration = sampler.realtimeParams.fadeInTime + sampler.realtimeParams.sustainTime + sampler.realtimeParams.fadeOutTime;
        const grainsPerSecond = sampler.realtimeParams.grainsPerSecond;
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

export class GranularSampler extends Synth {
    sampleSource: SampleSource;
    realtimeParams: GrainRealtimeParams = {
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
        super(audioContext, () => granularSamplerVoice(
            audioContext,
            this.realtimeParams,
            this.sampleSource
        ))
        this.sampleSource = new SampleSource(audioContext, sampleDefinition);
        this.output.gain.value = 0.3;
        
        if (credits) this.credits = credits;
        if (name) this.name = name;

        const {
            relativeSampleStartTime,
        } = createParameters(this);

        this.enable = async () => {
            const { sampleSource } = this;
            if (sampleSource.isLoading || sampleSource.isLoaded) return;
            await sampleSource.load();
            this.loadingProgress += 1;
            if (!sampleSource.sampleBuffer) throw new Error("sample buffer load failed");
            this.realtimeParams.sampleOffsetTime = relativeSampleStartTime.value * sampleSource.sampleBuffer.duration;
        }
        this.disable = () => {
        }

    }
    params = [] as SynthParam[];
}
