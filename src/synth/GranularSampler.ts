import { NumberSynthParam, ParamType, ProgressSynthParam, SynthInstance, SynthParam } from "./SynthInterface";
import { filterMap } from "../functions/filterMap";
import { createArrayOf, createFilteredArrayOf } from "../functions/createArrayOf";
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

            const t1 = params.fadeInTime;
            const t2 = t1 + params.sustainTime;
            const t3 = t2 + params.fadeOutTime;

            bufferSource.start(scheduleTime, sampleStartTime, t3);
            gainNode.gain.setValueAtTime(0, scheduleTime);
            gainNode.gain.linearRampToValueAtTime(1, scheduleTime + t1);
            gainNode.gain.linearRampToValueAtTime(1, scheduleTime + t2);
            gainNode.gain.linearRampToValueAtTime(0, scheduleTime + t3);

            // const testTri = audioContext.createOscillator();
            // testTri.type = "triangle";
            // testTri.frequency.value = targetFrequency;
            // testTri.start();
            // this.output = testTri;

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

class GranularSamplerVoice {
    inUse: boolean = false;
    sampleSource: SampleSource;
    outputNode: GainNode;
    audioContext: AudioContext;
    params: GrainRealtimeParams;
    constructor(audioContext: AudioContext, sampleSource: SampleSource, params: GrainRealtimeParams) {
        this.audioContext = audioContext;
        this.outputNode = this.audioContext.createGain();
        this.outputNode.gain.value = 0.5;
        this.sampleSource = sampleSource;
        this.params = params;
    }

    trigger = (
        frequency: number,
        duration: number,
        absoluteStartTime: number,
        velocity: number,
        noteStartedTimeAgo: number = 0,
    ) => {
        const {
            grainsPerSecond,
            sampleOffsetTime,
        } = this.params;
        if (this.inUse) throw new Error("Polyphony fail: voice already in use");
        this.inUse = true;
        const grainsCount = Math.floor(grainsPerSecond * duration);
        const mkGrain = (grainNumber: number) => {
            if (!this.sampleSource?.sampleBuffer) return;
            const grain = getSoundGrain(
                this.audioContext,
                this.sampleSource.sampleBuffer,
                this.sampleSource.sampleInherentFrequency
            );
            const relativeStartTime = grainNumber / grainsPerSecond;
            grain.play(
                sampleOffsetTime,
                absoluteStartTime + relativeStartTime,
                frequency,
                this.params
            );
            grain.output.connect(this.outputNode);


            // const testSquare = this.audioContext.createOscillator();
            // testSquare.type = "square";
            // testSquare.frequency.value = frequency;
            // testSquare.start();
            // testSquare.connect(this.outputNode);

            return grain;
        }


        const eventGrains = createFilteredArrayOf(grainsCount, mkGrain);
        

    };

    stop = () => {
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


    sampler.params.push({
        displayName: "Grains per second",
        type: ParamType.number,
        min: 1, max: 100,
        get value() {
            return sampler.voiceParams.grainsPerSecond;
        },
        set value(value: number) {
            sampler.voiceParams.grainsPerSecond = value;
        },
        exportable: true,
    } as NumberSynthParam);

    sampler.params.push({
        displayName: "Grain fade time",
        type: ParamType.number,
        min: 0, max: 2,
        get value() {
            return sampler.voiceParams.fadeInTime;
        },
        set value(value: number) {
            sampler.voiceParams.fadeInTime = value;
            sampler.voiceParams.fadeOutTime = value;
        },
        exportable: true,
    } as NumberSynthParam);


    sampler.params.push({
        displayName: "Grain sustain time",
        type: ParamType.number,
        min: 0, max: 2,
        get value() {
            return sampler.voiceParams.sustainTime;
        },
        set value(value: number) {
            sampler.voiceParams.sustainTime = value;
        },
        exportable: true,
    } as NumberSynthParam);

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

    sampler.params.push(relativeSampleStartTime);

    return {
        relativeSampleStartTime
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
