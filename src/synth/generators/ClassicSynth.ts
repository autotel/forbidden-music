import { adsrWorkletManager } from "@/functions/adsrWorkletManager";
import { createAutomatableAudioNodeParam } from "../types/Automatable";
import { EventParamsBase, Synth, SynthVoice } from "../types/Synth";
import { ParamType, SynthParam } from "../types/SynthParam";
import { env } from "process";

type SineNoteParams = EventParamsBase & {
    perc: boolean,
}

const classicSynthVoice = (audioContext: AudioContext, parentSynth: ClassicSynth): SynthVoice => {

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    if(!parentSynth.adsrWorkletManager) {
        throw new Error("ADSR worklet manager not enabled");
    }
    const env1 = parentSynth.adsrWorkletManager.create();
    const env2 = parentSynth.adsrWorkletManager.create();

    const env2Mapper = audioContext.createGain();

    env1.worklet.connect(gainNode.gain);
    env2.worklet.connect(env2Mapper);
    env2Mapper.connect(filter.detune);

    const applySynthParams = () => {
        filter.type = parentSynth.filterTypeParam.getType();
        filter.Q.value = parentSynth.filterQParam.value;
        filter.frequency.value = parentSynth.filterOctaveParam.getHertz();
        oscillator.type = parentSynth.waveShapeParam.getType();

        env1.params.attack.value = parentSynth.envelopes[0].attackParam.value;
        env1.params.attackcurve.value = parentSynth.envelopes[0].attackCurveParam.value;
        env1.params.decay.value = parentSynth.envelopes[0].decayParam.value;
        env1.params.sustain.value = parentSynth.envelopes[0].sustainParam.value;
        env1.params.release.value = parentSynth.envelopes[0].releaseParam.value;

        env2.params.attack.value = parentSynth.envelopes[1].attackParam.value;
        env2.params.attackcurve.value = parentSynth.envelopes[1].attackCurveParam.value;
        env2.params.decay.value = parentSynth.envelopes[1].decayParam.value;
        env2.params.sustain.value = parentSynth.envelopes[1].sustainParam.value;
        env2.params.release.value = parentSynth.envelopes[1].releaseParam.value;

        env2Mapper.gain.value = parentSynth.filterEnvParam.value;
    }

    let noteStarted = 0;
    let noteVelocity = 0;

    oscillator.connect(filter);
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
            noteVelocity = params.velocity;
            this.inUse = true;
            
            gainNode.gain.value=0;

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
                const noteDuration = absoluteEndTime - noteStarted;
                
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


class EnvelopeParamsList {
    attackParam = {
        type: ParamType.number,
        displayName: "Attack",
        value: 0.01,
        min: 0,
        max: 60,
        exportable: true,
    }
    attackCurveParam = {
        type: ParamType.number,
        displayName: "Attack curve",
        value: 0.5,
        min: 0,
        max: 1,
        exportable: true,
    }
    decayParam = {
        type: ParamType.number,
        displayName: "Decay",
        value: 0.7,
        min: 0,
        max: 60,
        exportable: true,
    }
    sustainParam = {
        type: ParamType.number,
        displayName: "Sustain",
        value: 0.3,
        min: 0,
        max: 1,
        exportable: true,
    }
    releaseParam = {
        type: ParamType.number,
        displayName: "Release",
        value: 0.3,
        min: 0,
        max: 60,
        exportable: true,
    }
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
    }
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
    }
    filterQParam = {
        type: ParamType.number,
        displayName: "Filter Q",
        value: 1,
        min: 0,
        max: 6,
        exportable: true,
    }
    filterEnvParam = {
        type: ParamType.number,
        displayName: "Filter envelope amount",
        value: 0,
        min: 0,
        max: 10000,
        exportable: true,
    }
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
    };

    envelopes = [
        new EnvelopeParamsList(),
        new EnvelopeParamsList(),
    ];

    params = [
        this.waveShapeParam,
        this.filterOctaveParam,
        this.filterQParam,
        this.filterEnvParam,
        this.filterTypeParam,
        // ADSRs
        ...this.envelopes.map(e => e.list).flat(),
    ] as SynthParam[];


    adsrWorkletManager?: Awaited<ReturnType<typeof adsrWorkletManager>>;

    constructor(
        audioContext: AudioContext,
    ) {
        super(audioContext, classicSynthVoice);
        const outputGain = this.output;
        this.output.gain.value = 0.1;
        const gain = createAutomatableAudioNodeParam(
            outputGain.gain, 'gain', 0, 1
        );
        this.params.push(gain);

        this.enable = async () => {
            this.adsrWorkletManager = await adsrWorkletManager(audioContext);
        }

    }
}
