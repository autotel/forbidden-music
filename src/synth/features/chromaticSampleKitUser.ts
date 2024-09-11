import { SampleKitDefinition } from "@/store/externalSampleLibrariesStore";
import { OtherSynthParam, ParamType, ProgressSynthParam, SynthParam, SynthParamMinimum } from "../types/SynthParam";

/**
 * Definition of a single loadable sample
 */
export interface SampleFileDefinition {
    name: string;
    path: string;
    // inherent
    frequency: number;
    velocity?: number;
    // mapped
    frequencyStart: number;
    frequencyEnd: number;
    velocityStart: number;
    velocityEnd: number;
}

export interface SampleKitUser {
    sampleKitParam: OtherSynthParam;
    loadingProgressParam: ProgressSynthParam;
    sampleKitManager: ReturnType<typeof chromaticSampleKitManager>;
}

const isCloserManhattan = (source: [number, number], target: [number, number], currentClosestDistance: number) => {
    const sourceDistance = Math.abs(source[0] - target[0]) + Math.abs(source[1] - target[1]);
    if (sourceDistance < currentClosestDistance) {
        return sourceDistance;
    } else {
        return false;
    }
}

export const selectSampleSourceFromKit = (
    sampleSources: SampleSource[],
    frequency: number,
    velocity?: number,
    listener?: SampleItemChosenListenerType
): SampleSource | undefined => {
    if (sampleSources.length == 0) return undefined;
    const velo127 = velocity ? Math.floor(velocity * 127) : 127;
    
    let closestSampleSource = sampleSources[0];
    let closestIndex = 0;
    let closestDistance: number = Infinity;

    let frequencyAlreadyMatched = false;

    if (sampleSources.length == 1) {
        if (listener) listener(closestSampleSource, closestIndex);
        return closestSampleSource;
    }

    for (let i = 0; i < sampleSources.length; i++) {
        const iSampleSource = sampleSources[i];
        // thus allowing usage of partially loaded instrments
        if(iSampleSource.isLoaded === false) continue;

        const isFrequencyMatch = iSampleSource.frequencyStart < frequency && frequency < iSampleSource.frequencyEnd;

        // when we find matching frequency, we are happy
        // we simply find better matching velocity
        if (isFrequencyMatch) {
            frequencyAlreadyMatched = true;
            closestSampleSource = iSampleSource;
            closestIndex = i;
        }

        const isPerfectMatch = (
            isFrequencyMatch &&
            (iSampleSource.velocityStart < velo127 && velo127 <= iSampleSource.velocityEnd)
        );

        if (isPerfectMatch) {
            if (listener) listener(iSampleSource, i);
            return iSampleSource;
        }
        // worst case scenario match
        if (!frequencyAlreadyMatched) {
            const iFrequency = iSampleSource.frequency;
            const iVelo127 = iSampleSource.velocity || 127;

            const isTheClosest = isCloserManhattan(
                [iFrequency, iVelo127],
                [frequency, velo127],
                closestDistance
            );

            if (isTheClosest !== false) {
                closestDistance = isTheClosest;
                closestSampleSource = iSampleSource;
                closestIndex = i;
            }
        }
    }

    if (listener) listener(closestSampleSource, closestIndex);
    return closestSampleSource;
}

export class SampleSource implements SampleFileDefinition {
    private audioContext: AudioContext;
    sampleBuffer?: AudioBuffer;
    frequency: number;
    velocity?: number;

    velocityStart: number;
    velocityEnd: number;
    frequencyStart: number;
    frequencyEnd: number;

    isLoaded: boolean = false;
    isLoading: boolean = false;

    path: string;
    name: string;

    load = async () => {
        console.error("samplesource constructed wrong");
    };

    constructor(audioContext: AudioContext, sampleDefinition: SampleFileDefinition) {
        this.audioContext = audioContext;
        this.frequency = sampleDefinition.frequency;

        this.frequencyStart = sampleDefinition.frequencyStart;
        this.frequencyEnd = sampleDefinition.frequencyEnd;
        this.velocityStart = sampleDefinition.velocityStart;
        this.velocityEnd = sampleDefinition.velocityEnd;

        this.path = sampleDefinition.path;
        this.name = sampleDefinition.name;

        if ('velocity' in sampleDefinition) {
            this.velocity = sampleDefinition.velocity;
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

export type SampleKitChangedListenerType = (sampleKitDef: SampleKitDefinition) => void;
export type SampleItemChosenListenerType = (sampleSource: SampleSource, index: number) => void;

export const chromaticSampleKitManager = (audioContext: AudioContext, initialSamplesDefinition: SampleKitDefinition) => {
    const sampleKitChangedListeners: SampleKitChangedListenerType[] = [];
    const sampleItemChosenListeners: SampleItemChosenListenerType[] = [];
    let lastSampleDefinition = initialSamplesDefinition;
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
                samples: value.samples.map(({
                    path, frequency,
                    frequencyStart, frequencyEnd,
                    velocityStart, velocityEnd
                }) => ({
                    path, frequency,
                    frequencyStart, frequencyEnd,
                    velocityStart, velocityEnd
                }))
            } as SampleKitDefinition;
            if (value.readme) this._v.readme = value.readme;
            changeSampleDefinition(this._v);
            lastSampleDefinition = value;
        },
        displayName: "Sample kit",
        type: ParamType.other,
        exportable: true,
    } as OtherSynthParam;

    const sampleSources: SampleSource[] = [];

    const changeSampleDefinition = async (sampleKitDef: SampleKitDefinition) => {
        const samples = lastSampleDefinition.samples;
        lastSampleDefinition = sampleKitDef;

        sampleSources.splice(
            0, sampleSources.length,
            ...samples.map((sampleDefinition) => {
                return new SampleSource(audioContext, sampleDefinition);
            })
        )
        loadingProgressParam.value = 0;
        const loadingProgressStep = 100 / samples.length;
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

    let chosenSampleListener = undefined as SampleItemChosenListenerType | undefined;

    const retValue = {
        get lastSampleDefinition() { return lastSampleDefinition },
        sampleKitParam,
        loadingProgressParam,
        sampleSources,
        changeSampleDefinition,
        selectSampleSourceFromKit: (frequency: number, velocity?: number) => {
            return selectSampleSourceFromKit(sampleSources, frequency, velocity, chosenSampleListener);
        },
        addSampleKitChangedListener: (listener: SampleKitChangedListenerType) => {
            sampleKitChangedListeners.push(listener);
        },
        removeSampleKitChangedListener: (listener: SampleKitChangedListenerType) => {
            sampleKitChangedListeners.filter(l => l !== listener);
        },
        addSampleItemChosenListener: (listener: SampleItemChosenListenerType) => {
            sampleItemChosenListeners.push(listener);
            chosenSampleListener = (...p) => sampleItemChosenListeners.forEach((l) => l(...p));
        },
        removeSampleItemChosenListener: (listener: SampleItemChosenListenerType) => {
            sampleItemChosenListeners.filter(l => l !== listener);
            if (sampleItemChosenListeners.length == 0) chosenSampleListener = undefined;
        },
    };

    return retValue;
}
