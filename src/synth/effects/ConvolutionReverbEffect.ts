import { AudioModule } from "../types/AudioModule";
import { createAutomatableAudioNodeParam } from "../types/Automatable";
import { SynthParam, OptionSynthParam, ParamType, NumberSynthParam, BooleanSynthParam } from "../types/SynthParam";

export interface ImpulseResponseSampleDefinition {
    name: string,
    path: string,
    readme: string,
}

const createConvolutionReverb = async (
    impulseResponseUrl: string, audioContext: AudioContext
): Promise<{
    input: AudioNode, output: AudioNode
}> => {
    const output = audioContext.createGain();
    const convolver = audioContext.createConvolver();
    convolver.connect(output);
    const response = await fetch(impulseResponseUrl)
    const buffer = await response.arrayBuffer();
    const decodedBuffer = await audioContext.decodeAudioData(buffer);
    convolver.buffer = decodedBuffer;
    return { input: convolver, output };
}

export class ConvolutionReverbEffect extends AudioModule {
    private audioContext: AudioContext;
    private loadingProgress = 0;
    
    input: AudioNode;
    name = "";
    output: AudioNode;
    params: SynthParam[] = [];
    credits: string = "-";
    alreadyBuiltReverbs: { [key: string]: { input: AudioNode, output: AudioNode } } = {};
    constructor(
        audioContext: AudioContext,
        sampleDefinitions: ImpulseResponseSampleDefinition[],
    ) {
        super();
        this.audioContext = audioContext;
        const dcOffsetRemover = audioContext.createBiquadFilter();
        this.output = this.audioContext.createGain();
        this.input = this.audioContext.createGain();
        const dry = this.audioContext.createGain();
        const send = this.audioContext.createGain();
        this.input.connect(dry);
        dry.connect(this.output);
        this.input.connect(send);
        send.gain.value = 0;
        dry.gain.value = 1;
        dcOffsetRemover.type = 'highpass';
        dcOffsetRemover.frequency.value = 30;
        let currentConvolver: Awaited<ReturnType<typeof createConvolutionReverb>> | undefined;

        dcOffsetRemover.connect(this.output);
        const sup = this;
        const dcOffsetRemoverParam = {
            type: ParamType.boolean,
            displayName: 'DC Offset Remover',
            _v: true,
            set value(value: boolean) {
                this._v = value;
                if (currentConvolver) {
                    currentConvolver.output.disconnect();
                    if (this._v) {
                        currentConvolver.output.connect(dcOffsetRemover);
                    } else {
                        currentConvolver.output.connect(sup.output);
                    }
                }
            },
            get value() {
                return this._v;
            },
            exportable: true,
        } as BooleanSynthParam;

        const changeImplulseResponseUrl = async (path: string) => {
            if (!this.alreadyBuiltReverbs[path]) {
                this.alreadyBuiltReverbs[path] = await createConvolutionReverb(path, this.audioContext);
            }
            send.disconnect();
            currentConvolver = this.alreadyBuiltReverbs[path];
            send.connect(currentConvolver.input);
            if (dcOffsetRemoverParam.value) {
                currentConvolver.output.connect(dcOffsetRemover);
            } else {
                currentConvolver.output.connect(this.output);
            }
        }
        let currentSampleDefinition: ImpulseResponseSampleDefinition = sampleDefinitions[0];
        const changeImpulseResponse = async (sampleDefinition: ImpulseResponseSampleDefinition) => {
            await changeImplulseResponseUrl(sampleDefinition.path);
            currentSampleDefinition = sampleDefinition;
            this.credits = sampleDefinition.readme;
        }

        const sampleChoiceDefinition: OptionSynthParam = {
            type: ParamType.option,
            displayName: 'Sample',
            _v: 0,
            options: sampleDefinitions.map((sampleDefinition) => {
                return {
                    displayName: sampleDefinition.name,
                    value: sampleDefinition.path,
                }
            }),
            set value(value: number) {
                this._v = value;
                changeImpulseResponse(sampleDefinitions[this._v]);
            },
            get value() {
                return this._v;
            },
            exportable: true,
        }
        const sendParam = createAutomatableAudioNodeParam(
            send.gain, 'Send level', 0, 1
        );
        const dryParam: NumberSynthParam = createAutomatableAudioNodeParam(
            dry.gain, 'Dry level', 0, 1
        );

        this.params = [
            sampleChoiceDefinition,
            sendParam,
            dryParam,
            dcOffsetRemoverParam,
        ];

        this.enable = async () => {
            sampleChoiceDefinition.value = 0;
            this.markReady();
        }
        this.disable = () => {
        }
        const parent = this;
    }
}
