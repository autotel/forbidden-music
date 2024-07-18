import { adsrWorkletManager } from "@/functions/adsrWorkletManager";
import { automatableNumberSynthParam } from "../types/Automatable";
import { EventParamsBase, Synth, SynthVoice } from "../types/Synth";
import { numberSynthParam, NumberSynthParam, OptionSynthParam, ParamType, SynthParam } from "../types/SynthParam";
import { env } from "process";
import { foldedSaturatorWorkletManager } from "@/functions/foldedSaturatorWorkletManager";

type SineNoteParams = EventParamsBase & {
    perc: boolean,
}

const classicSynthVoice = (audioContext: AudioContext, parentSynth: ClassicSynth): SynthVoice => {

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    if (!parentSynth.adsrWorkletManager) {
        throw new Error("ADSR worklet manager not enabled");
    }
    const env1 = parentSynth.adsrWorkletManager.create();
    const env2 = parentSynth.adsrWorkletManager.create();
    
    const env2Mapper = audioContext.createGain();

    if(!parentSynth.waveFolderWorkletManager) {
        throw new Error("Wave folder worklet manager not enabled");
    }
    const waveFolder = parentSynth.waveFolderWorkletManager.create();

    env1.worklet.connect(gainNode.gain);
    env2.worklet.connect(env2Mapper);
    env2Mapper.connect(filter.detune);

    const applySynthParams = () => {
        filter.type = parentSynth.filterTypeParam.getType();
        filter.Q.value = parentSynth.filterQParam.value;
        filter.frequency.value = parentSynth.filterOctaveParam.getHertz();
        oscillator.type = parentSynth.waveShapeParam.getType();

        env1.params.attack.value = parentSynth.envelopes[0].attackParam.mappedValue;
        env1.params.attackcurve.value = parentSynth.envelopes[0].attackCurveParam.value;
        env1.params.decay.value = parentSynth.envelopes[0].decayParam.mappedValue;
        env1.params.sustain.value = parentSynth.envelopes[0].sustainParam.value;
        env1.params.release.value = parentSynth.envelopes[0].releaseParam.mappedValue;

        env2.params.attack.value = parentSynth.envelopes[1].attackParam.mappedValue;
        env2.params.attackcurve.value = parentSynth.envelopes[1].attackCurveParam.value;
        env2.params.decay.value = parentSynth.envelopes[1].decayParam.mappedValue;
        env2.params.sustain.value = parentSynth.envelopes[1].sustainParam.value;
        env2.params.release.value = parentSynth.envelopes[1].releaseParam.mappedValue;

        env2Mapper.gain.value = parentSynth.filterEnvParam.value;

        waveFolder.params.preGain.value = parentSynth.waveFoldParam.value;
        waveFolder.params.postGain.value = 1 / parentSynth.waveFoldParam.value;
    }

    let noteStarted = 0;

    oscillator.connect(waveFolder.worklet);
    waveFolder.worklet.connect(filter);
    filter.connect(gainNode);
    oscillator.start();

    return {
        inUse: false,
        output: gainNode,
        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            params: SineNoteParams
        ) {
            this.inUse = true;

            gainNode.gain.value = 0;

            env1.triggerAtTime(absoluteStartTime, params.velocity);
            env2.triggerAtTime(absoluteStartTime, 1);

            oscillator.frequency.value = frequency;
            oscillator.frequency.setValueAtTime(frequency, absoluteStartTime);
            applySynthParams();
            noteStarted = absoluteStartTime;

            if (params.perc) {
                this.scheduleEnd(absoluteStartTime + 0.01);
            }
            return this;
        },
        scheduleEnd(absoluteEndTime?: number) {
            if (absoluteEndTime) {

                env1.triggerStopAtTime(absoluteEndTime);
                env2.triggerStopAtTime(absoluteEndTime);

                setTimeout(() => {
                    this.inUse = false;
                }, (absoluteEndTime - audioContext.currentTime) * 1000 + 10);
            } else {
                env1.triggerStopAtTime(audioContext.currentTime);
                env2.triggerStopAtTime(audioContext.currentTime);
                this.inUse = false;
            }
            return this;
        }
    };

}

type BiquadFilterType = "allpass" | "bandpass" | "highpass" | "highshelf" | "lowpass" | "lowshelf" | "notch" | "peaking"
type OscillatorType = "sine" | "square" | "sawtooth" | "triangle"


const extenseTimeParam = (displayName: string, value = 0.01): NumberSynthParam & { mappedValue: number } => ({
    type: ParamType.number,
    displayName,
    _mapFn: (val: number) => Math.pow(val, 5) * 60,
    get displayValue() {
        return this.mappedValue.toFixed(3) + 's';
    },
    get mappedValue() {
        return this._mapFn(this.value);
    },
    value,
    min: 0,
    max: 1,
    exportable: true,
});

class EnvelopeParamsList {
    attackParam = extenseTimeParam("Attack");
    attackCurveParam = {
        type: ParamType.number,
        displayName: "Attack curve",
        value: 0.5,
        min: 0,
        max: 1,
        exportable: true,
    } as NumberSynthParam;
    decayParam = extenseTimeParam("Decay", 0.3);
    sustainParam = {
        type: ParamType.number,
        displayName: "Sustain",
        value: 0.3,
        min: 0,
        max: 1,
        exportable: true,
    } as NumberSynthParam;
    releaseParam = extenseTimeParam("Release", 0.3);
    list = [
        this.attackParam,
        this.attackCurveParam,
        this.decayParam,
        this.sustainParam,
        this.releaseParam,
    ] as SynthParam[];
}

export class ClassicSynth extends Synth {
    waveShapeParam = {
        type: ParamType.option,
        displayName: 'Wave shape',
        getType(): OscillatorType {
            return this.options[this.value].value as OscillatorType;
        },
        options: [{
            value: 'sine',
            displayName: 'Sine',
        }, {
            value: 'square',
            displayName: 'Square',
        }, {
            value: 'sawtooth',
            displayName: 'Sawtooth',
        }, {
            value: 'triangle',
            displayName: 'Triangle',
        }],
        value: 0,
        exportable: true,
    } as OptionSynthParam;
    filterOctaveParam = {
        type: ParamType.number,
        displayName: "Filter frequency",
        getHertz() { return 40 * Math.pow(2, this.value) },
        value: 5,
        get displayValue() {
            return `${this.getHertz().toFixed(3)}`;
        },
        min: 0,
        max: 15,
        exportable: true,
    } as NumberSynthParam;
    filterQParam = {
        type: ParamType.number,
        displayName: "Filter Q",
        value: 1,
        min: 0,
        max: 6,
        exportable: true,
    } as NumberSynthParam;
    filterEnvParam = {
        type: ParamType.number,
        displayName: "Filter envelope amount",
        value: 0,
        min: 0,
        max: 10000,
        exportable: true,
    } as NumberSynthParam;
    filterTypeParam = {
        type: ParamType.option,
        displayName: 'Filter type',
        getType(): BiquadFilterType {
            return this.options[this.value].value as BiquadFilterType;
        },
        options: [{
            value: 'lowpass',
            displayName: 'Lowpass',
        }, {
            value: 'highpass',
            displayName: 'Highpass',
        }, {
            value: 'bandpass',
            displayName: 'Bandpass',
        }, {
            value: 'notch',
            displayName: 'Notch',
        }],
        value: 0,
        exportable: true,
    } as OptionSynthParam;

    waveFoldParam = {
        type: ParamType.number,
        displayName: "Wave fold",
        value: 1,
        min: 1,
        max: 2,
        exportable: true,
    } as NumberSynthParam;

    envelopes = [
        new EnvelopeParamsList(),
        new EnvelopeParamsList(),
    ];

    params = [
        this.waveShapeParam,
        this.waveFoldParam,
        this.filterOctaveParam,
        this.filterQParam,
        this.filterEnvParam,
        this.filterTypeParam,
        // ADSRs
        ...this.envelopes.map(e => e.list).flat(),
    ] as SynthParam[];

    gainParam: NumberSynthParam;
    input: GainNode;
    adsrWorkletManager?: Awaited<ReturnType<typeof adsrWorkletManager>>;
    waveFolderWorkletManager?: Awaited<ReturnType<typeof foldedSaturatorWorkletManager>>;

    constructor(
        audioContext: AudioContext,
    ) {
        super(audioContext, classicSynthVoice);
        this.input = audioContext.createGain();

        const outputGain = this.output;
        this.output.gain.value = 0.1;
        const gain = automatableNumberSynthParam(
            outputGain.gain, 'out gain', 0, 1
        );

        this.gainParam = gain;
        this.params.push(gain);
        this.params.unshift(numberSynthParam(this.input.gain, 'input', 0, 1));

        this.enable = async () => {
            this.adsrWorkletManager = await adsrWorkletManager(audioContext);
            this.waveFolderWorkletManager = await foldedSaturatorWorkletManager(audioContext);
            this.markReady();
        }

    }
}
