import { buffer } from "stream/consumers";
import { BooleanSynthParam, NumberSynthParam, ParamType, SynthParam } from "./interfaces/SynthParam";
import { SynthVoice, EventParamsBase, Synth } from "./super/Synth";
import { useThrottleFn } from "@vueuse/core";

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
const chageTrigNumParam = ({
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
const curveFunction = (t: number, curve: number) => {
    // crossfades between exp and linear
    // result is value between 0 and 1 as function of t (seconds) 
    return Math.max(0, 1 - Math.pow(t, curve));
}
const clampAudio = (v: number) => {
    return Math.min(1, Math.max(-1, v));
}
export class KickSynth extends Synth {
    paramChanged = () => { };
    startOctave = chageTrigNumParam({
        displayName: "start octave",
        min: 0, max: 4,
        value: 2.273,
    }, () => this.paramChanged())
    vDecayTime = chageTrigNumParam({
        displayName: "amplitude decay time",
        min: 0, max: 2,
        value: 0.5,
    }, () => this.paramChanged())
    fDecayTime = chageTrigNumParam({
        displayName: "frequency decay time",
        min: 0, max: 2,
        value: 0.04,
    }, () => this.paramChanged())
    vcurve = chageTrigNumParam({
        displayName: "amplitude curve",
        min: 0, max: 1,
        value: 0.5,
    }, () => this.paramChanged())
    fcurve = chageTrigNumParam({
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
    updateBuffer = (): AudioBuffer => {
        this.currentWave = [];
        const sampleRate = this.audioContext.sampleRate;
        const decaySamples = (this.vDecayTime.value * sampleRate) || 1;
        const newBuffer = this.audioContext.createBuffer(1, decaySamples, sampleRate);
        const data = newBuffer.getChannelData(0);
        const aliasError = this.alias.value;
        let phase = 0;
        for (let i = 0; i < decaySamples; i++) {
            const t = i / decaySamples;
            const secs = i / sampleRate;
            const octaveAdd = (
                this.startOctave.value * curveFunction(secs / this.fDecayTime.value, this.fcurve.value)
            );
            let oct = 1 + octaveAdd;
            if(aliasError) oct *= 10;
            const frequency = this.inherentSampleFrequency * Math.pow(2, oct);
            phase += frequency / sampleRate;
            this.currentWave[i] = Math.sin(Math.PI * 2 * phase) * curveFunction(t, this.vcurve.value);
            data[i] = clampAudio(this.currentWave[i]);
        }
        this.currentBuffer = newBuffer;
        // just so that I can definitely define buffer @ contstructor
        return newBuffer;
    }
    constructor(
        audioContext: AudioContext
    ) {
        super(audioContext, kickVoice);
        this.currentBuffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
        this.output.gain.value = 0.1;

        this.enable = () => {
            this.paramChanged = useThrottleFn(() => {
                this.updateBuffer();
            }, 10)
            this.paramChanged();
        }

        this.params = [
            this.startOctave,
            this.vDecayTime,
            this.vcurve,
            this.fDecayTime,
            this.fcurve,
            this.alias,
        ];


    }
}
