import { createFoldedSaturatorWorklet } from "@/functions/foldedSaturatorWorkletFactory";
import { oneShotEnvelope } from "../features/oneShotEnvelope";
import { AutomatableSynthParam, automatableNumberSynthParam, getTweenSlice } from "../types/Automatable";
import { EventParamsBase, Synth } from "../types/Synth";
import { numberSynthParam, NumberSynthParam, OptionSynthParam, ParamType, SynthParam } from "../types/SynthParam";


type PerxThingyNoteParams = {
    envelopeBuffer: AudioBuffer,
    velocity: number,
}

const perxVoice = (audioContext: AudioContext, parentSynth: PerxThingy) => {

    const oscillator = audioContext.createOscillator();
    const modulator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const modulatorGain = audioContext.createGain();
    gainNode.gain.value = 0;

    oscillator.connect(gainNode)
    modulator.connect(modulatorGain);
    modulatorGain.connect(oscillator.frequency);
    oscillator.start();
    modulator.start();

    let audioBufferSource = audioContext.createBufferSource();
    let currentStopTimeout: ReturnType<typeof setTimeout> | undefined;

    return {
        inUse: false,
        output: gainNode,
        imprecision: 0 as number,
        pan: 0 as number,

        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            params: PerxThingyNoteParams
        ) {
            if (currentStopTimeout) {
                clearTimeout(currentStopTimeout);
                currentStopTimeout = undefined;
            }
            const buffer = params.envelopeBuffer;
            this.inUse = true;
            oscillator.frequency.value = frequency;
            modulator.frequency.value = parentSynth.modulatorOctave.hertz;
            oscillator.type = parentSynth.oscillatorType.getWave();
            modulatorGain.gain.value = parentSynth.modulatorAmount.value;
            audioBufferSource = audioContext.createBufferSource();
            audioBufferSource.buffer = buffer;
            audioBufferSource.connect(gainNode.gain);
            audioBufferSource.start(absoluteStartTime);
            audioBufferSource.onended = () => {
                this.releaseVoice();
            }
            return this;
        },
        scheduleEnd() {
            return this;
        },
        stop() {
        },
        releaseVoice() {
            audioBufferSource.disconnect();
            this.inUse = false;
            currentStopTimeout = undefined;
        }
    };

};

type PerxThingyVoice = ReturnType<typeof perxVoice>;

const initialModulatorOctave = 4;

export class PerxThingy extends Synth<EventParamsBase> {
    voices: PerxThingyVoice[] = [];

    envelopeGen: ReturnType<typeof oneShotEnvelope>;

    modulatorOctave = {
        type: ParamType.number,
        displayName: "Modulator Frequency",
        _mapFn: (v: number) => Math.pow(2, v) / 10,
        value: initialModulatorOctave,
        get hertz() {
            return this._mapFn(this.value);
        },
        get displayValue() {
            return `${this.hertz.toFixed(3)} Hz`;
        },
        min: 0,
        max: 15,
        exportable: true,
    } as NumberSynthParam;

    modulatorAmount = {
        type: ParamType.number,
        displayName: "Modulation",
        value:0,
        min: 0,
        max: 1200,
        exportable: true,
    } as NumberSynthParam;

    oscillatorType = {
        displayName: "oscillator type",
        exportable: true,
        type: ParamType.option,
        value: 0,
        getWave() {
            return this.options[this.value].value;
        },
        options: [
            { value: "sine", displayName: "sine" },
            { value: "sawtooth", displayName: "sawtooth" },
            { value: "square", displayName: "square" },
            { value: "triangle", displayName: "triangle" },
        ],
    } as OptionSynthParam;



    constructor(
        audioContext: AudioContext,
    ) {
        super(audioContext);

        this.transformTriggerParams = (params: EventParamsBase): PerxThingyNoteParams => {
            return {
                ...params,
                envelopeBuffer: this.envelopeGen.currentBuffer.value,
            };
        }

        let enableCalled = false;
        this.envelopeGen = oneShotEnvelope(audioContext);

        this.enable = async () => {
            if (enableCalled) return;
            enableCalled = true;

            const foldedSaturator = await createFoldedSaturatorWorklet(audioContext);
            // @ts-ignore
            const preGainParam = foldedSaturator.parameters.get("preGain") as AudioParam;
            // @ts-ignore
            const postGainParam = foldedSaturator.parameters.get("postGain") as AudioParam;
            if (!preGainParam || !postGainParam) throw new Error("no preGain or postGain");

            const {
                attackParam,
                decayParam,
                attackCurveParam,
                decayCurveParam,
            } = this.envelopeGen;

            attackParam.max = 0.1;
            decayParam.max = 0.1;

            this.params.push(this.oscillatorType);
            this.params.push(attackParam, decayParam, attackCurveParam, decayCurveParam);
            this.params.push(automatableNumberSynthParam(
                preGainParam, 'fold pre-gain', 0, 1.5
            ));
            this.params.push(automatableNumberSynthParam(
                postGainParam, 'gain'
            ));
            this.params.push(this.modulatorOctave);
            this.params.push(this.modulatorAmount);

            foldedSaturator.connect(this.output);


            this.createVoice = () => {
                const voice = perxVoice(
                    audioContext,
                    this
                );
                if (voice.output) voice.output.connect(foldedSaturator);
                return voice;
            }

            this.markReady();
        }
    }
    params = [] as SynthParam[];
}
