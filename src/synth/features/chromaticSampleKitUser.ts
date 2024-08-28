import { SampleKitDefinition } from "@/store/externalSampleLibrariesStore";
import { EventParamsBase, Synth, SynthVoice } from "../types/Synth";
import { NumberSynthParam, OtherSynthParam, ParamType, ProgressSynthParam, SynthParam, SynthParamMinimum } from "../types/SynthParam";

/**
 * Definition of a single loadable sample
 */
export interface SampleFileDefinition {
    name: string;
    frequency: number;
    velocity?: number;
    path: string;
}

export interface SamplerSourceBase {
    sampleInherentFrequency: number;
    sampleInherentVelocity?: number;
    isLoaded: boolean;
}

export interface SampleKitUser {
    sampleKitParam: OtherSynthParam;
    loadingProgressParam: ProgressSynthParam;
    sampleKitManager: ReturnType<typeof chromaticSampleKitManager>;
}

export const findSampleSourceClosestToFrequency = <SSc extends SamplerSourceBase>(
    sampleSources: SSc[],
    frequency: number,
    velocity?: number,
): SSc | undefined => {
    if (sampleSources.length == 0) return undefined;
    let closestSampleSource: SSc = sampleSources[0];
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

export class SampleSource {
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

export const chromaticSampleKitManager = (audioContext: AudioContext, initialSamplesDefinition: SampleKitDefinition) => {

    const sampleKitChangedListeners: ((sampleKitDef: SampleKitDefinition) => void)[] = [];

    const loadingProgressParam = {
        displayName: "Loading progress",
        type: ParamType.progress,
        min: 0, max: 100,
        value: 0,
        exportable: false,
    } as ProgressSynthParam;

    const sampleKitParam = {
        _v: {},
        get value() {
            return this._v;
        },
        set value(value: SampleKitDefinition) {
            this._v = {
                name: value.name,
                samples: value.samples.map(({ path, frequency }) => ({ path, frequency }))
            } as SampleKitDefinition;
            if (value.readme) this._v.readme = value.readme;
            changeSampleDefinition(this._v);
        },
        displayName: "Sample kit",
        type: ParamType.other,
        exportable: true,
    } as OtherSynthParam;

    const sampleSources: SampleSource[] = [];

    const changeSampleDefinition = async (sampleKitDef: SampleKitDefinition) => {
        const sampleDefinitions = sampleKitDef.samples;

        sampleSources.splice(
            0, sampleSources.length,
            ...sampleDefinitions.map((sampleDefinition) => {
                return new SampleSource(audioContext, sampleDefinition);
            })
        )
        loadingProgressParam.value = 0;
        const loadingProgressStep = 100 / sampleDefinitions.length;
        const everyPromise: Promise<any>[] = [];
        sampleSources.forEach(async (sampleSource) => {
            if (sampleSource.isLoading || sampleSource.isLoaded) return;
            const promise = sampleSource.load();
            everyPromise.push(promise);
            await promise;
            loadingProgressParam.value += loadingProgressStep;
        });
        await Promise.all(everyPromise);
        sampleKitChangedListeners.forEach((listener) => listener(sampleKitDef));
    }

    sampleKitParam.value = initialSamplesDefinition;

    return {
        sampleKitParam,
        loadingProgressParam,
        sampleSources,
        changeSampleDefinition,
        findSampleSourceClosestToFrequency: (frequency: number, velocity?: number) => {
            return findSampleSourceClosestToFrequency(sampleSources, frequency, velocity);
        },
        addSampleKitChangedListener: (listener: (sampleKitDef: SampleKitDefinition) => void) => {
            sampleKitChangedListeners.push(listener);
        },
    }
}
