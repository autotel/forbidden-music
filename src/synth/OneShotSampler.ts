import { EventParamsBase, NumberSynthParam, ParamType, ProgressSynthParam, SynthParam, SynthVoice } from "./super/SynthInterface";
import { Synth } from "./super/Synth";

class PerformanceChronometer {
    private startTime: number;
    constructor() {
        this.startTime = performance.now();
    }
    getElapsedTime = () => {
        return performance.now() - this.startTime;
    }
    reset = () => {
        this.startTime = performance.now();
    }
    logElapsedTime = (text: string) => {
        console.log(text, this.getElapsedTime().toFixed(2), "ms");
        this.reset();
    }
}

interface SampleFileDefinition {
    name: string;
    frequency: number;
    velocity?: number;
    path: string;
}

interface SamplerSourceBase {
    sampleInherentFrequency: number;
    sampleInherentVelocity?: number;
    isLoaded: boolean;
}

export const findSampleSourceClosestToFrequency = <SSc extends SamplerSourceBase>(
    sampleSources: SSc[],
    frequency: number,
    velocity?: number,
): SSc => {
    let closestSampleSource = sampleSources[0];
    if (sampleSources.length == 1) return closestSampleSource;

    if (velocity == undefined) {
        let closestSampleSourceDifference = Math.abs(frequency - closestSampleSource.sampleInherentFrequency);
        for (let i = 1; i < sampleSources.length; i++) {
            const sampleSource = sampleSources[i];
            if (!sampleSource.isLoaded) continue;
            const difference = Math.abs(frequency - sampleSource.sampleInherentFrequency);
            if (difference < closestSampleSourceDifference) {
                closestSampleSource = sampleSource;
                closestSampleSourceDifference = difference;
            }
        }
    } else {
        const sampleSourcesWithVelocityAboveOrEqual = sampleSources.filter((sampleSource) => {
            if (!sampleSource.sampleInherentVelocity) return true;
            return sampleSource.sampleInherentVelocity >= velocity;
        });

        if (sampleSourcesWithVelocityAboveOrEqual.length == 0) {
            findSampleSourceClosestToFrequency(sampleSources, frequency);
        }

        let closestSampleWithLeastVelocityDifference = sampleSourcesWithVelocityAboveOrEqual[0];
        let closestSampleWithLeastVelocityDifferenceDifference = Math.abs(frequency - closestSampleWithLeastVelocityDifference.sampleInherentFrequency);
        for (let i = 1; i < sampleSourcesWithVelocityAboveOrEqual.length; i++) {
            const sampleSource = sampleSourcesWithVelocityAboveOrEqual[i];
            if (!sampleSource.isLoaded) continue;
            const difference = Math.abs(frequency - sampleSource.sampleInherentFrequency);
            if (difference < closestSampleWithLeastVelocityDifferenceDifference) {
                closestSampleWithLeastVelocityDifference = sampleSource;
                closestSampleWithLeastVelocityDifferenceDifference = difference;
            }
        }
        closestSampleSource = closestSampleWithLeastVelocityDifference;
    }
    return closestSampleSource;
}

const samplerVoice = (
    audioContext: AudioContext,
    sampleSources: SampleSource[] = []
): SynthVoice => {
    let velocityToStartPoint: number = 0;
    let bufferSource: AudioBufferSourceNode | undefined;
    const output = audioContext.createGain();
    output.gain.value = 0;
    let countPerVelocityStep: { [key: number]: number } = {};
    let timeAccumulator = 0;
    let currentAdsr = [0.01, 10, 0, 0.2];
    const voiceState = {
        inUse: false,
    }

    sampleSources.forEach((sampleSource) => {
        if ('sampleInherentVelocity' in sampleSource) {
            const velocity = sampleSource.sampleInherentVelocity as number;
            if (!countPerVelocityStep[velocity]) {
                countPerVelocityStep[velocity] = 0;
            }
            countPerVelocityStep[velocity] += 1;
        }
    });
    sampleSources.sort((a, b) => {
        if (!a.sampleInherentVelocity) return -1;
        if (!b.sampleInherentVelocity) return 1;
        return a.sampleInherentVelocity - b.sampleInherentVelocity;
    });


    const cancelScheduledValues = () => {
        output.gain.cancelScheduledValues(0);
        // this.output.gain.value = 0;
    }

    const resetBufferSource = (sampleSource?: SampleSource) => {
        if (bufferSource) {
            bufferSource.removeEventListener("ended", releaseVoice);
            bufferSource.disconnect();
            bufferSource.stop();
            bufferSource = undefined;
        }

        if (!sampleSource) return;
        if (!sampleSource.sampleBuffer) throw new Error("sample buffer not loaded");

        cancelScheduledValues();

        bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = sampleSource.sampleBuffer;
        bufferSource.connect(output);
    }



    interface SamplerEventParams extends EventParamsBase {
        velocity: number,
        adsr: number[],
    }


    const releaseVoice = () => {
        voiceState.inUse = false;
        resetBufferSource();
    }
    const stop = () => {
        releaseVoice();
    };
    return {
        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            {
                velocity, adsr = [0.01, 10, 0, 0.2],
            }: SamplerEventParams
        ) {
            currentAdsr = adsr;
            if (voiceState.inUse) throw new Error("Polyphony fail: voice already in use");
            let noteStartedTimeAgo = audioContext.currentTime - absoluteStartTime;

            let skipSample = 0;
            if (noteStartedTimeAgo > 0) {
                skipSample = noteStartedTimeAgo;
            }

            voiceState.inUse = true;
            const sampleSource = findSampleSourceClosestToFrequency(sampleSources, frequency, velocity);
            resetBufferSource(sampleSource);

            if (!bufferSource) throw new Error("bufferSource not created");
            bufferSource.playbackRate.value = frequency / sampleSource.sampleInherentFrequency;

            output.gain.value = 0;
            timeAccumulator = absoluteStartTime;
            output.gain.setValueAtTime(0, timeAccumulator);
            timeAccumulator += currentAdsr[0];
            output.gain.linearRampToValueAtTime(velocity, timeAccumulator);
            timeAccumulator += currentAdsr[1];
            output.gain.linearRampToValueAtTime(/**value!*/currentAdsr[2], timeAccumulator);

            if (velocityToStartPoint) {
                if (velocity > 1) {
                    console.error("velocity > 1");
                }
                skipSample += velocityToStartPoint * (1 - velocity);
            }

            bufferSource.start(absoluteStartTime, skipSample);
            bufferSource.addEventListener("ended", releaseVoice);
            return this;
        },
        scheduleEnd(
            absoluteEndTime: number,
        ) {
            output.gain.linearRampToValueAtTime(0, absoluteEndTime + currentAdsr[3]);
            return this;
        },
        stop,
        output,
        get inUse() {
            return voiceState.inUse;
        },
        set inUse(value: boolean) {
            voiceState.inUse = value;
        }
    } as SynthVoice;
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

type SamplerVoice = ReturnType<typeof samplerVoice>;

export class OneShotSampler extends Synth<EventParamsBase, SamplerVoice> {
    private loadingProgress = 0;
    private velocityToStartPoint = 0;
    private adsr = [0.01, 10, 0, 0.2];
    needsFetching = true;
    credits = "Web audio one shop sampler implementation by Autotel";
    name = "One Shot Sampler";
    constructor(
        audioContext: AudioContext,
        sampleDefinitions: SampleFileDefinition[],
        name?: string,
        credits?: string
    ) {
        const sampleSources = sampleDefinitions.map((sampleDefinition) => {
            return new SampleSource(audioContext, sampleDefinition);
        });

        super(audioContext, (a) => samplerVoice(a, sampleSources));

        this.output = this.audioContext.createGain();
        this.output.gain.value = 0.3;

        if (credits) this.credits = credits;
        if (name) this.name = name + " Sampler";

        this.enable = () => {
            if (this.isReady) return;
            sampleSources.forEach(async (sampleSource) => {
                if (sampleSource.isLoading || sampleSource.isLoaded) return;
                await sampleSource.load();
                this.loadingProgress += 1;
                if (
                    this.loadingProgress > 2 ||
                    this.loadingProgress == sampleDefinitions.length
                ) this.isReady = true;
            });
        }
        this.disable = () => {
        }

        const parent = this;
        this.params.push({
            displayName: "Level",
            type: ParamType.number,
            min: 0, max: 4,
            get value() {
                if (!parent.output) {
                    console.warn("output node not set");
                    return 1;
                }
                return parent.output.gain.value;
            },
            set value(value: number) {
                if (!parent.output) return;
                parent.output.gain.value = value;
            },
            exportable: true,
        } as SynthParam);

        this.params.push({
            displayName: "Loading progress",
            type: ParamType.progress,
            min: 0, max: sampleDefinitions.length,
            get value() {
                return parent.loadingProgress;
            },
            exportable: false,
        } as ProgressSynthParam);

        this.adsr.forEach((v, i) => {
            this.params.push({
                displayName: ['attack', 'decay', 'sustain', 'release'][i],
                type: ParamType.number,
                min: 0, max: 10,
                get value() {
                    return parent.adsr[i];
                },
                set value(value: number) {
                    parent.adsr[i] = value;
                },
                curve: 'log',
                exportable: true,
            } as NumberSynthParam);
        });

        this.params.push({
            displayName: "Velocity to start point, seconds",
            type: ParamType.number,
            min: 0, max: 3,
            get value() {
                return parent.velocityToStartPoint;
            },
            set value(value: number) {
                parent.velocityToStartPoint = value;
            },
            curve: 'log',
            exportable: true,
        } as SynthParam);


    }
    scheduleStart = (
        frequency: number,
        absoluteStartTime: number,
        eventParams: EventParamsBase,
    ) => super.scheduleStart(frequency, absoluteStartTime, {
        adsr: this.adsr,
        ...eventParams
    });
    schedulePerc(
        frequency: number,
        absoluteStartTime: number,
        noteParameters: EventParamsBase
    ): SynthVoice<EventParamsBase> {
        const tweakedAdsr = [...this.adsr];
        tweakedAdsr[3] *= 4 * noteParameters.velocity;
        
        const tweakedParam = {
            ...noteParameters,
            adsr: tweakedAdsr,
        };
        const voice = this.scheduleStart(frequency, absoluteStartTime, tweakedParam);
        voice.scheduleEnd(absoluteStartTime + this.adsr[0]);
        return voice;
    }
}
