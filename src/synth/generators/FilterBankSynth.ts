import { adsrWorkletManager } from "@/functions/adsrWorkletManager";
import { automatableNumberSynthParam } from "../types/Automatable";
import { EventParamsBase, Synth, SynthVoice } from "../types/Synth";
import { castToOptionDefList, numberSynthParam, NumberSynthParam, OptionSynthParam, OtherSynthParam, ParamType, SynthParam } from "../types/SynthParam";
import { env } from "process";
import { foldedSaturatorWorkletManager } from "@/functions/foldedSaturatorWorkletManager";
import { octaveToFrequency } from "@/functions/toneConverters";
import { noiseWorkletManager } from "@/functions/noiseWorkletManager";
import { release } from "os";
import { WaveFolderEffect } from "../effects/WaveFoldEffect";

type SineNoteParams = EventParamsBase & {
    perc: boolean,
}

export type FilterDefinition = {
    type: BiquadFilterType,
    Q: number,
    envelopeDetune: boolean,
    envelopeQ: boolean,
    frequency: number,
    octave: number,
    gain: number,
}

type FilterVoice = SynthVoice & { input: AudioNode }

const filterVoice = (audioContext: AudioContext, parentSynth: FilterBankSynth): FilterVoice => {

    const output = audioContext.createGain();
    const input = audioContext.createGain();

    if (!parentSynth.adsrWorkletManager) {
        throw new Error("ADSR worklet manager not enabled");
    }

    const envVca = parentSynth.adsrWorkletManager.create();
    const envFq = parentSynth.adsrWorkletManager.create();
    const filters = [] as BiquadFilterNode[];
    const gains = [] as GainNode[];

    const envFqMapper = audioContext.createGain();

    output.gain.value = 0;
    envVca.worklet.connect(output.gain);
    envFq.worklet.connect(envFqMapper);

    const getOrCreateFilterNode = (i: number) => {
        if (!filters[i]) {
            filters[i] = audioContext.createBiquadFilter();
        }
        return filters[i];
    }
    const getOrCreateGainNode = (i: number) => {
        if (!gains[i]) {
            gains[i] = audioContext.createGain();
        }
        return gains[i];
    }

    const applySynthParams = (noteFrequency: number) => {

        parentSynth.filters.forEach((filterDef: FilterDefinition, i: number) => {
            const frequency = octaveToFrequency(filterDef.octave, noteFrequency);
            const filter = getOrCreateFilterNode(i);
            const gain = getOrCreateGainNode(i);
            input.connect(filter);
            filter.type = filterDef.type;
            filter.Q.value = filterDef.Q;
            // so... it seems not to work, at least for bandpass
            // filter.gain.value = filterDef.gain;
            gain.gain.value = filterDef.gain;
            filter.frequency.value = frequency;
            if (filterDef.envelopeDetune) {
                envFqMapper.connect(filter.detune);
            }
            if (filterDef.envelopeQ) {
                envFqMapper.connect(filter.Q);
            }
            filter.connect(gain);
            gain.connect(output);
        });

        envVca.params.attack.value = parentSynth.envelopes[0].attackParam.mappedValue;
        envVca.params.attackcurve.value = parentSynth.envelopes[0].attackCurveParam.value;
        envVca.params.decay.value = parentSynth.envelopes[0].decayParam.mappedValue;
        envVca.params.sustain.value = parentSynth.envelopes[0].sustainParam.value;
        envVca.params.release.value = parentSynth.envelopes[0].releaseParam.mappedValue;

        envFq.params.attack.value = parentSynth.envelopes[1].attackParam.mappedValue;
        envFq.params.attackcurve.value = parentSynth.envelopes[1].attackCurveParam.value;
        envFq.params.decay.value = parentSynth.envelopes[1].decayParam.mappedValue;
        envFq.params.sustain.value = parentSynth.envelopes[1].sustainParam.value;
        envFq.params.release.value = parentSynth.envelopes[1].releaseParam.mappedValue;
    }

    const releaseVoice = (o: { inUse: boolean }) => {
        filters.forEach(filter => filter.disconnect());
        input.disconnect();
        console.log("voice released");
        o.inUse = false;
    }
    return {
        inUse: false,
        output,
        input,
        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            params: SineNoteParams
        ) {
            this.inUse = true;

            envVca.worklet.connect(input.gain);
            envVca.triggerAtTime(absoluteStartTime, params.velocity);
            envFq.triggerAtTime(absoluteStartTime, 1);
            applySynthParams(frequency);

            if (params.perc) {
                this.scheduleEnd(absoluteStartTime + envVca.params.attack.value + envVca.params.decay.value);
            }
            return this;
        },
        scheduleEnd(absoluteEndTime?: number) {
            if (absoluteEndTime) {

                envVca.triggerStopAtTime(absoluteEndTime);
                envFq.triggerStopAtTime(absoluteEndTime);

                const afterReleaseTime = absoluteEndTime + envVca.params.release.value;

                setTimeout(() => {
                    releaseVoice(this);
                }, (afterReleaseTime - audioContext.currentTime) * 1000 + 10);
            } else {
                envVca.triggerStopAtTime(audioContext.currentTime);
                envFq.triggerStopAtTime(audioContext.currentTime);
                releaseVoice(this);
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

export class FilterBankSynth extends Synth<EventParamsBase, FilterVoice> {

    static filterOctaveMax = 5;
    static filterOctaveMin = -5;
    static Qmin = 0;
    static Qmax = 60;
    static filterGainMin = 0;
    static filterGainMax = 1;

    envelopes = [
        new EnvelopeParamsList(),
        new EnvelopeParamsList(),
    ];


    gainParam: NumberSynthParam;
    input: GainNode;
    adsrWorkletManager?: Awaited<ReturnType<typeof adsrWorkletManager>>;
    noiseWorkletManager?: Awaited<ReturnType<typeof noiseWorkletManager>>;
    noiseGenerator?: AudioNode;
    delayNode: DelayNode;
    feedbackSend: GainNode;

    filters: FilterDefinition[] = [{
        type: 'bandpass',
        Q: 6,
        envelopeDetune: false,
        envelopeQ: false,
        frequency: 0,
        octave: 0,
        gain: 1,
    }, {
        type: 'bandpass',
        Q: 1,
        envelopeDetune: false,
        envelopeQ: false,
        frequency: 0,
        octave: 1,
        gain: 0.7,
    }, {
        type: 'bandpass',
        Q: 1,
        envelopeDetune: false,
        envelopeQ: false,
        frequency: 0,
        octave: -1,
        gain: 0.7,
    }, {
        type: 'bandpass',
        Q: 0,
        envelopeDetune: false,
        envelopeQ: false,
        frequency: 0,
        octave: 2,
        gain: 0,
    }, {
        type: 'bandpass',
        Q: 0,
        envelopeDetune: false,
        envelopeQ: false,
        frequency: 0,
        octave: -2,
        gain: 0,
    }];


    params = [
        // ADSRs
        ...this.envelopes.map(e => e.list).flat(),
    ] as SynthParam[];

    constructor(
        audioContext: AudioContext,
    ) {
        super(audioContext, filterVoice);
        this.input = audioContext.createGain();

        this.feedbackSend = audioContext.createGain();
        this.delayNode = audioContext.createDelay(0.2);
        this.delayNode.delayTime.value = 0.07;
        const noiseGain = audioContext.createGain();
        const outputGain = this.output;
        this.output.gain.value = 0.1;
        this.feedbackSend.connect(this.delayNode);

        const synth = this;
        this.params.push({
            displayName: 'bands',
            get value() {
                return synth.filters;
            },
            set value(v: FilterDefinition[]) {
                synth.filters = v;
            },
            exportable: true,
        } as OtherSynthParam);

        const gain = automatableNumberSynthParam(
            outputGain.gain, 'out gain', 0, 1
        );
        const noiseLevel = automatableNumberSynthParam(
            noiseGain.gain, 'noise level', 0, 1
        );
        const feedbackSendParam = automatableNumberSynthParam(
            this.feedbackSend.gain, 'feedback send', 0, 2
        );

        this.gainParam = gain;
        this.params.push(gain);
        this.params.push(noiseLevel);
        this.params.push(feedbackSendParam);
        this.params.push(numberSynthParam(this.input.gain, 'input', 0, 1));
        this.params.push(automatableNumberSynthParam(this.delayNode.delayTime, 'delayTime'))

        const feedbackWaveFolder = new WaveFolderEffect(audioContext);

        this.enable = async () => {
            this.noiseWorkletManager = await noiseWorkletManager(audioContext);
            this.adsrWorkletManager = await adsrWorkletManager(audioContext);
            this.noiseGenerator = this.noiseWorkletManager.create().worklet;
            this.noiseGenerator.connect(noiseGain);

            await feedbackWaveFolder.enable();

            this.delayNode.connect(feedbackWaveFolder.input);
            feedbackWaveFolder.output.connect(this.output);

            this.params.push(...feedbackWaveFolder.params);

            this.markReady();
        }
        const superCreateVoice = this.createVoice;
        this.createVoice = () => {
            const voice = superCreateVoice();
            noiseGain.connect(voice.input);
            voice.output?.connect(this.feedbackSend);
            this.input.connect(voice.input);
            this.delayNode.connect(voice.input);
            return voice;
        }

    }
}
