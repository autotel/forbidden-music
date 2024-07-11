import { useDebounceFn } from "@vueuse/core";
import { EventParamsBase, Synth, SynthVoice } from "../types/Synth";
import { BooleanSynthParam, NumberSynthParam, ParamType, SynthParam } from "../types/SynthParam";

const kickVoice = (audioContext: AudioContext, synth: KickSynth): SynthVoice<EventParamsBase> => {

    let source: AudioBufferSourceNode | undefined;
    let output = audioContext.createGain();
    let eventStartedTime = 0;

    const releaseVoice = (v: { inUse: boolean }) => {
        v.inUse = false;
        if (!source) return;
        source.disconnect();
        source.stop();
    }

    const setBuffer = (buffer: AudioBuffer) => {
        source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = false;
    };

    return {
        inUse: false,
        output,
        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            evtParams: EventParamsBase
        ) {
            this.inUse = true;
            setBuffer(synth.currentBuffer);
            eventStartedTime = absoluteStartTime;
            if (!source) throw new Error("failed to create source");
            source.connect(output);
            source.playbackRate.value = frequency / synth.inherentSampleFrequency;
            source.start(absoluteStartTime);
            output.gain.value = evtParams.velocity;
            return this;
        },
        scheduleEnd(absoluteStopTime?: number) {
            if (!absoluteStopTime) {
                releaseVoice(this);
            } else {
                const duration = absoluteStopTime - eventStartedTime;
                setTimeout(() => {
                    releaseVoice(this);
                }, duration * 1000);
                return this;
            }
        },

    }
}
interface CTPP {
    displayName: string,
    min: number,
    max: number,
    value: number,
}
const changeTrigNumParam = ({
    displayName, min, max, value
}: CTPP, listener: () => void) => {
    return {
        _v: value,
        displayName,
        type: ParamType.number,
        min,
        max,
        set value(v: number) {
            this._v = v;
            listener();
        },
        get value() {
            return this._v;
        },
        exportable: true,
    } as NumberSynthParam
}
const chageTrigBoolParam = ({
    displayName, value
}: { displayName: string, value: boolean }, listener: () => void) => {
    return {
        _v: value,
        displayName,
        type: ParamType.boolean,
        set value(v: boolean) {
            this._v = v;
            listener();
        },
        get value() {
            return this._v;
        },
        exportable: true,
    } as BooleanSynthParam
}
export class KickSynth extends Synth {
    paramChanged = () => { };
    startOctave = changeTrigNumParam({
        displayName: "start octave",
        min: 0, max: 4,
        value: 2.273,
    }, () => this.paramChanged())
    vDecayTime = changeTrigNumParam({
        displayName: "amplitude decay time",
        min: 0, max: 2,
        value: 0.5,
    }, () => this.paramChanged())
    fDecayTime = changeTrigNumParam({
        displayName: "frequency decay time",
        min: 0, max: 2,
        value: 0.04,
    }, () => this.paramChanged())
    vcurve = changeTrigNumParam({
        displayName: "amplitude curve",
        min: 0, max: 1,
        value: 0.5,
    }, () => this.paramChanged())
    fcurve = changeTrigNumParam({
        displayName: "frequency curve",
        min: 0, max: 1,
        value: 0.5,
    }, () => this.paramChanged())
    alias = chageTrigBoolParam({
        displayName: "broken",
        value: false,
    }, () => this.paramChanged())
    currentWave: number[] = [];
    currentBuffer: AudioBuffer;
    params: SynthParam[];
    inherentSampleFrequency = 80;
    worker: undefined | Worker = undefined;
    waitingResponseSince: false | number = 0;
    newWaveListener = false as false | ((wave: number[]) => void);
    applyNewWave = (audioContext: AudioContext, newWave: Float32Array) => {
        const newBuffer = audioContext.createBuffer(1, newWave.length, audioContext.sampleRate);
        const data = newBuffer.getChannelData(0);
        for (let i = 0; i < newWave.length; i++) {
            if (isNaN(newWave[i])) newWave[i] = 0;
            data[i] = newWave[i];
        }
        this.currentWave = Array.from(newWave);
        this.currentBuffer = newBuffer;
        this.waitingResponseSince ? console.log("calc took", Date.now() - this.waitingResponseSince, "ms") : null;
        this.waitingResponseSince = false;
        if (this.newWaveListener) this.newWaveListener(this.currentWave);
    }
    requestNewWave: () => void;
    constructor(
        audioContext: AudioContext
    ) {
        super(audioContext, kickVoice);
        this.currentBuffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
        this.output.gain.value = 0.1;
        this.params = [
            this.startOctave,
            this.vDecayTime,
            this.vcurve,
            this.fDecayTime,
            this.fcurve,
            this.alias,
        ];
        this.requestNewWave = () => {
            if (this.waitingResponseSince) {
                const length = Date.now() - this.waitingResponseSince;
                if (length > 1000) {
                    console.error(this.name, "worker timed out");
                    this.waitingResponseSince = false;
                } else {
                    console.warn(this.name, "worker recalc request while waiting for a prev one");
                    // this.worker?.terminate();
                    return;
                }
            }
            if (!this.worker) {
                console.error(this.name, "worker not loaded");
                return;
            }
            this.worker.postMessage({
                inherentSampleFrequency: this.inherentSampleFrequency,
                startOctave: this.startOctave.value,
                vDecayTime: this.vDecayTime.value,
                vcurve: this.vcurve.value,
                fDecayTime: this.fDecayTime.value,
                fcurve: this.fcurve.value,
                aliasError: this.alias.value,
                sampleRate: audioContext.sampleRate,
            });
            this.waitingResponseSince = Date.now();
        }
        this.worker = new Worker(
            new URL('./KickSampleGenWorker.js', import.meta.url),
            { type: 'module' }
        );
        this.worker.onmessage = (e: MessageEvent<Float32Array>) => {
            this.applyNewWave(audioContext, e.data);
        }
        this.paramChanged = useDebounceFn(() => {
            console.log("param changed", this.alias.value);
            this.requestNewWave()
        }, 10);
        this.paramChanged();
    }
}
