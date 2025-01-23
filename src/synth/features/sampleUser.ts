import isTauri, { tauriObject } from "@/functions/isTauri";
import { OtherSynthParam, ParamType, ProgressSynthParam } from "../types/SynthParam";


type LoadFrom = "http" | "file";
/**
 * Definition of a single loadable sample
 */
export interface SampleDefinition {
    name: string;
    path: string;
    loadFrom: LoadFrom;
    readme?: string;
}

export interface SampleUser {
    sampleParam: OtherSynthParam;
    loadingProgressParam: ProgressSynthParam;
    sampleKitManager: ReturnType<typeof sampleManager>;
}

type SampleSourceFetcher = (sampleDefinition: SampleDefinition) => Promise<ArrayBuffer>;

const httpFetchSampleSource: SampleSourceFetcher = async (sampleDefinition: SampleDefinition) => {
    let arrayBuffer: ArrayBuffer;
    console.log("remote fetch of ", sampleDefinition.path);
    const response = await fetch(sampleDefinition.path,
        {
            cache: "default",
        });
    arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
}

const fsFetchSampleSource: SampleSourceFetcher = async (sampleDefinition: SampleDefinition) => {
    console.log("local fetch of ", sampleDefinition.path);
    if(!isTauri()) throw new Error("fsFetchSampleSource called in non-tauri environment");
    const { fs } = await tauriObject();
    const path = sampleDefinition.path;
    const uint8Array = await fs.readBinaryFile(path);
    const arrayBuffer = uint8Array.buffer;
    return arrayBuffer as ArrayBuffer;
}

export class SampleSource implements SampleDefinition {
    private audioContext: AudioContext;
    sampleBuffer?: AudioBuffer;

    isLoaded: boolean = false;
    isLoading: boolean = false;
    loadFrom: LoadFrom;
    readme?: string;

    path: string;
    name: string;

    load = async () => {
        console.error("samplesource constructed wrong");
    };

    constructor(audioContext: AudioContext, sampleDefinition: SampleDefinition, fetcher: SampleSourceFetcher) {
        this.audioContext = audioContext;

        this.path = sampleDefinition.path;
        this.name = sampleDefinition.name;
        this.loadFrom = sampleDefinition.loadFrom || "http";
        this.readme = sampleDefinition.readme;

        this.load = async () => {
            if (this.isLoaded || this.isLoading) throw new Error("redundant load call");
            this.isLoading = true;
            const arrayBuffer = await fetcher(sampleDefinition);

            this.sampleBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.isLoaded = true;
            this.isLoading = false;
        }
    }
}

export type SampleChangedListenerType = (sampleKitDef: SampleDefinition) => void;
export type SampleItemLoadedListenerType = (sampleSource: SampleSource) => void;

const serializeSample = (sampleDef: SampleDefinition):SampleDefinition => {
    return {
        name: sampleDef.name,
        readme: sampleDef.readme,
        loadFrom: sampleDef.loadFrom,
        path: sampleDef.path,
    };
}

const initialSampleDefinition: SampleDefinition = {
    "path": "audio/chromatic/test-tone/440.wav",
    "name": "440.wav",
    "loadFrom": "http",
}

export const sampleManager = (audioContext: AudioContext) => {
    const sampleChangedListeners: SampleChangedListenerType[] = [];
    const sampleLoadedListeners: SampleItemLoadedListenerType[] = [];

    const loadingProgressParam = {
        displayName: "Loading progress",
        type: ParamType.progress,
        min: 0, max: 100,
        value: 0,
        exportable: false,
    } as ProgressSynthParam;

    const sampleParam = {
        _v: {},
        get value() {
            return this._v;
        },
        set value(value: SampleDefinition) {
            changeSampleDefinition(value);
            // register what would be saved as part of the project
            this._v = serializeSample(value);
            console.log("my new value is", this._v);
            lastSampleDefinition = value;
        },
        displayName: "Sample kit",
        type: ParamType.other,
        exportable: true,
    } as OtherSynthParam;

    let sampleSource: SampleSource | null = null;
    let lastSampleDefinition = initialSampleDefinition;

    const everyPromise: Promise<any>[] = [];
    const waitClearUpPromises = async () => {
        await Promise.all(everyPromise);
        everyPromise.length = 0;
    }

    const changeSampleDefinition = async (sampleDef: SampleDefinition) => {
        await waitClearUpPromises();
        console.log("changing sample definition to ", sampleDef.name);

        lastSampleDefinition = sampleDef;

        loadingProgressParam.value = 0;
        
        const fetcher = sampleDef.loadFrom === 'file' ? fsFetchSampleSource : httpFetchSampleSource;

        const loc_sampleSource = new SampleSource(audioContext, sampleDef, fetcher);
        sampleSource =  new SampleSource(audioContext, sampleDef, fetcher);

        sampleChangedListeners.forEach((listener) => listener(sampleDef));

        if (loc_sampleSource.isLoading || loc_sampleSource.isLoaded) return;
        const promise = loc_sampleSource.load();
        everyPromise.push(promise);
        await promise;
        sampleLoadedListeners.forEach((listener) => listener(loc_sampleSource));
        // TODO: get progress from somewhere
        loadingProgressParam.value += 1;
  

        await Promise.all(everyPromise);
    }

    sampleParam.value = initialSampleDefinition;

    const retValue = {
        get lastSampleDefinition() { return lastSampleDefinition },
        sampleParam,
        loadingProgressParam,
        get sampleSource() { return sampleSource; },
        changeSampleDefinition,
        addSampleChangedListener: (listener: SampleChangedListenerType) => {
            sampleChangedListeners.push(listener);
        },
        removeSampleKitChangedListener: (listener: SampleChangedListenerType) => {
            sampleChangedListeners.filter(l => l !== listener);
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
