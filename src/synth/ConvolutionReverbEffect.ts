import { AudioModule, EffectInstance, NumberSynthParam, OptionSynthParam, ParamType, ProgressSynthParam, SynthInstance, SynthParam } from "./SynthInterface";

export interface ImpulseResponseSampleDefinition {
    name: string,
    path: string,
    readme: string,
}

const createConvolutionReverb = async (
    impulseResponseUrl: string, audioContext: AudioContext
): Promise<{
    inputNode: AudioNode, output: AudioNode
}> => {
    const output = audioContext.createGain();
    const convolver = audioContext.createConvolver();
    convolver.connect(output);
    const response = await fetch(impulseResponseUrl)
    const buffer = await response.arrayBuffer();
    const decodedBuffer = await audioContext.decodeAudioData(buffer);
    convolver.buffer = decodedBuffer;
    return { inputNode: convolver, output };
}

export class ConvolutionReverbEffect implements EffectInstance {
    private audioContext: AudioContext;
    private loadingProgress = 0;
    inputNode: AudioNode;
    output: AudioNode;
    params: SynthParam[] = [];
    name: string = "Convolution Reverb";
    enable: () => void;
    disable: () => void;
    credits: string = "";
    alreadyBuiltReverbs: { [key: string]: { inputNode: AudioNode, output: AudioNode } } = {};
    constructor(
        audioContext: AudioContext,
        sampleDefinitions: ImpulseResponseSampleDefinition[],
    ) {
        this.audioContext = audioContext;
        this.output = this.audioContext.createGain();
        this.inputNode = this.audioContext.createGain();
        const dry = this.audioContext.createGain();
        const wet = this.audioContext.createGain();
        this.inputNode.connect(dry);
        dry.connect(this.output);
        this.inputNode.connect(wet);
        wet.gain.value = 0.25;
        dry.gain.value = 0.75;

        const changeImplulseResponseUrl = async (path: string) => {
            if (!this.alreadyBuiltReverbs[path]) {
                this.alreadyBuiltReverbs[path] = await createConvolutionReverb(path, this.audioContext);
            }
            wet.disconnect();
            const alreadyBuilt = this.alreadyBuiltReverbs[path];
            wet.connect(alreadyBuilt.inputNode);
            alreadyBuilt.output.connect(this.output);
        }
        const changeImpulseResponse = async (sampleDefinition:ImpulseResponseSampleDefinition) => {
            await changeImplulseResponseUrl(sampleDefinition.path);
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
        const wetParam: NumberSynthParam = {
            type: ParamType.number,
            displayName: 'Wet level',
            set value(value: number) {
                wet.gain.value = value;
            },
            get value() {
                return wet.gain.value;
            },
            min: 0,
            max: 1,
            exportable: true,
        }
        const dryParam: NumberSynthParam = {
            type: ParamType.number,
            displayName: 'Dry level',
            set value(value: number) {
                dry.gain.value = value;
            },
            get value() {
                return dry.gain.value;
            },
            min: 0,
            max: 1,
            exportable: true,
        }

        this.params = [
            sampleChoiceDefinition,
            wetParam,
            dryParam,
        ];

        this.enable = async () => {
            sampleChoiceDefinition.value = 0;
        }
        this.disable = () => {
        }
        const parent = this;
    }
}
