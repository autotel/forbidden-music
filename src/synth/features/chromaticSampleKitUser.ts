import { SampleKitDefinition } from "@/dataTypes/SampleKitDefinition";
import { tauriObject } from "@/functions/isTauri";
import { OtherSynthParam, ParamType, ProgressSynthParam } from "../types/SynthParam";

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

const tauriFetch = async (path: string) => {
    const { fs } = await tauriObject();
    return fs.readBinaryFile(path);
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
        if (iSampleSource.isLoaded === false) continue;

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
    if (!closestSampleSource.isLoaded) {
        return undefined;
    }
    if (listener) listener(closestSampleSource, closestIndex);
    return closestSampleSource;
}

type SampleSourceFetcher = (sampleDefinition: SampleFileDefinition) => Promise<ArrayBuffer>;

const httpFetchSampleSource: SampleSourceFetcher = async (sampleDefinition: SampleFileDefinition) => {
    let arrayBuffer: ArrayBuffer;
    // if (isRemote) {
    console.log("remote fetch of ", sampleDefinition.path);
    const response = await fetch(sampleDefinition.path,
        {
            cache: "default",
        });
    // console.groupCollapsed("header: " + sampleDefinition.path);
    // response.headers.forEach((value, key) => {
    //     if (key.match('date')) {
    //         console.log("loaded:", (Date.now() - Date.parse(value)) / 1000 / 60, " minutes ago");
    //     } else if (key.match('cache-control')) {
    //         console.log(key + ":", value);
    //     }
    // });
    // console.groupEnd();
    arrayBuffer = await response.arrayBuffer();
    // } else {
    //     console.log("local fetch of ", sampleDefinition.path);
    //     arrayBuffer = await tauriFetch(sampleDefinition.path)
    // }
    return arrayBuffer;
}

const fsFetchSampleSource: SampleSourceFetcher = async (sampleDefinition: SampleFileDefinition) => {
    console.log("local fetch of ", sampleDefinition.path);
    const { fs } = await tauriObject();
    const path = sampleDefinition.path;
    const uint8Array = await fs.readBinaryFile(path);
    const arrayBuffer = uint8Array.buffer;
    // const castedPath = convertFileSrc(sampleDefinition.path);
    // const response = await fetch(castedPath);
    // const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer as ArrayBuffer;
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

    constructor(audioContext: AudioContext, sampleDefinition: SampleFileDefinition, fetcher: SampleSourceFetcher) {
        this.audioContext = audioContext;
        this.frequency = sampleDefinition.frequency;

        this.frequencyStart = sampleDefinition.frequencyStart;
        this.frequencyEnd = sampleDefinition.frequencyEnd;
        this.velocityStart = sampleDefinition.velocityStart;
        this.velocityEnd = sampleDefinition.velocityEnd;

        this.path = sampleDefinition.path;
        this.name = sampleDefinition.name;

        this.load = async () => {
            if (this.isLoaded || this.isLoading) throw new Error("redundant load call");
            this.isLoading = true;
            const arrayBuffer = await fetcher(sampleDefinition);

            this.sampleBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.isLoaded = true;
            this.isLoading = false;
        }

        if ('velocity' in sampleDefinition) {
            this.velocity = sampleDefinition.velocity;
        }

    }
}

export type SampleKitChangedListenerType = (sampleKitDef: SampleKitDefinition) => void;
export type SampleItemChosenListenerType = (sampleSource: SampleSource, index: number) => void;
export type SampleItemLoadedListenerType = (sampleSource: SampleSource, index: number) => void;

const serializeSampleKit = (sampleKitDef: SampleKitDefinition) => {
    return {
        name: sampleKitDef.name,
        readme: sampleKitDef.readme,
        loadFrom: sampleKitDef.loadFrom,
        samples: sampleKitDef.samples.map(({
            path, frequency,
            frequencyStart, frequencyEnd,
            velocityStart, velocityEnd
        }) => ({
            path, frequency,
            frequencyStart, frequencyEnd,
            velocityStart, velocityEnd
        }))
    } as SampleKitDefinition;
}

const initialSamplesDefinition: SampleKitDefinition = {
  "name": "Test Tone",
  "fromLibrary": "chromatic/test-tone",
  "type": "chromatic",
  "loadFrom": "http",
  "samples": [
    {
      "frequency": 440,
      "path": "audio/chromatic/test-tone/440.wav",
      "name": "440.wav",
      "velocityStart": 0,
      "velocityEnd": 127,
      "frequencyStart": 220,
      "frequencyEnd": Infinity
    }
  ]
}

export const chromaticSampleKitManager = (audioContext: AudioContext) => {
    const sampleKitChangedListeners: SampleKitChangedListenerType[] = [];
    const sampleItemChosenListeners: SampleItemChosenListenerType[] = [];
    const sampleLoadedListeners: SampleItemLoadedListenerType[] = [];

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
            changeSampleDefinition(value);
            // register what would be saved as part of the project
            this._v = serializeSampleKit(value);
            console.log("my new value is", this._v);
            lastSampleDefinition = value;
        },
        displayName: "Sample kit",
        type: ParamType.other,
        exportable: true,
    } as OtherSynthParam;

    let sampleSources: SampleSource[] = [];
    let lastSampleDefinition = initialSamplesDefinition;

    const everyPromise: Promise<any>[] = [];
    const waitClearUpPromises = async () => {
        await Promise.all(everyPromise);
        everyPromise.length = 0;
    }

    const changeSampleDefinition = async (sampleKitDef: SampleKitDefinition) => {
        await waitClearUpPromises();
        console.log("changing sample definition to ", sampleKitDef.name);
        const samples = sampleKitDef.samples;
        lastSampleDefinition = sampleKitDef;

        loadingProgressParam.value = 0;
        const loadingProgressStep = 100 / samples.length;
        
        const fetcher = sampleKitDef.loadFrom === 'file' ? fsFetchSampleSource : httpFetchSampleSource;

        sampleSources = samples.map((sampleDefinition) => {
            return new SampleSource(audioContext, sampleDefinition, fetcher);
        })

        sampleKitChangedListeners.forEach((listener) => listener(sampleKitDef));

        sampleSources.forEach(async (sampleSource) => {
            if (sampleSource.isLoading || sampleSource.isLoaded) return;
            const promise = sampleSource.load();
            everyPromise.push(promise);
            await promise;
            sampleLoadedListeners.forEach((listener) => listener(sampleSource, sampleSources.indexOf(sampleSource)));
            loadingProgressParam.value += loadingProgressStep;
        });

        await Promise.all(everyPromise);
    }

    sampleKitParam.value = initialSamplesDefinition;

    let chosenSampleListener = undefined as SampleItemChosenListenerType | undefined;

    const retValue = {
        get lastSampleDefinition() { return lastSampleDefinition },
        sampleKitParam,
        loadingProgressParam,
        get sampleSources() { return sampleSources; },
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
        addSampleItemLoadedListener: (listener: SampleItemLoadedListenerType) => {
            sampleLoadedListeners.push(listener);
        },
        removeSampleItemLoadedListener: (listener: SampleItemLoadedListenerType) => {
            sampleLoadedListeners.filter(l => l !== listener);
        },
    };

    return retValue;
}
