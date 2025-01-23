import { SampleDefinition, sampleManager } from "../features/sampleUser";
import { AudioModule } from "../types/AudioModule";
import { automatableNumberSynthParam } from "../types/Automatable";
import { SynthParam, OptionSynthParam, ParamType, NumberSynthParam, BooleanSynthParam, OtherSynthParam } from "../types/SynthParam";

export interface ImpulseResponseSampleDefinition {
    name: string,
    path: string,
    kitName: string,
}

export interface ImpulseResponseKitDefinition {
    name: string,
    samples: ImpulseResponseSampleDefinition[],
    fromLibrary?: string,
    readme?: string,
}

const createConvolutionReverb = async (
    impulseResponseUrl: string, audioContext: AudioContext
): Promise<{
    input: AudioNode, output: AudioNode
}> => {
    const output = audioContext.createGain();
    const convolver = audioContext.createConvolver();
    const timeout = setTimeout(() => {
        throw new Error("timeout loading impulse response");
    }, 10000);
    convolver.connect(output);
    console.log("loading impulse response", impulseResponseUrl);
    const response = await fetch(impulseResponseUrl)
    console.log("loaded impulse response", impulseResponseUrl);
    const buffer = await response.arrayBuffer();
    console.log("decoded impulse response", impulseResponseUrl);
    const decodedBuffer = await audioContext.decodeAudioData(buffer);
    console.log("decoded impulse response", impulseResponseUrl);
    convolver.buffer = decodedBuffer;
    clearTimeout(timeout);
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
    sampleManager: ReturnType<typeof sampleManager>;
    sampleParam: OtherSynthParam;
    constructor(
        audioContext: AudioContext,
        samplesKit: ImpulseResponseKitDefinition,
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

        this.sampleManager = sampleManager(audioContext);

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
        this.sampleParam = this.sampleManager.sampleParam;
        this.sampleManager.addSampleChangedListener(async (sampleDef: SampleDefinition) => {
            this.credits = sampleDef.readme || '';
            const path = sampleDef.path;
            if (!this.alreadyBuiltReverbs[path]) {
                this.alreadyBuiltReverbs[path] = await createConvolutionReverb(path, this.audioContext);
                console.log("built new conv", path);
            } else {
                console.log("found existing conv", path);
            }
            console.log("sample changed", sampleDef);
            send.disconnect();
            currentConvolver = this.alreadyBuiltReverbs[path];
            send.connect(currentConvolver.input);
            if (dcOffsetRemoverParam.value) {
                currentConvolver.output.connect(dcOffsetRemover);
            } else {
                currentConvolver.output.connect(this.output);
            }
        });
        // const changeImplulseResponseUrl = async (path: string) => {
        //     if (!this.alreadyBuiltReverbs[path]) {
        //         this.alreadyBuiltReverbs[path] = await createConvolutionReverb(path, this.audioContext);
        //     }
        //     send.disconnect();
        //     currentConvolver = this.alreadyBuiltReverbs[path];
        //     send.connect(currentConvolver.input);
        //     if (dcOffsetRemoverParam.value) {
        //         currentConvolver.output.connect(dcOffsetRemover);
        //     } else {
        //         currentConvolver.output.connect(this.output);
        //     }
        // }
        // const sampleDefinitions = samplesKit.samples;

        // const changeImpulseResponse = async (sampleDefinition: ImpulseResponseSampleDefinition) => {
        //     await changeImplulseResponseUrl(sampleDefinition.path);
        //     this.credits = samplesKit.readme || '';
        // }

        // const sampleChoiceDefinition: OptionSynthParam = {
        //     type: ParamType.option,
        //     displayName: 'Sample',
        //     _v: 0,
        //     options: sampleDefinitions.map((sampleDefinition) => {
        //         return {
        //             displayName: sampleDefinition.name,
        //             value: sampleDefinition.path,
        //         }
        //     }),
        //     set value(value: number) {
        //         this._v = value;
        //         changeImpulseResponse(sampleDefinitions[this._v]);
        //     },
        //     get value() {
        //         return this._v;
        //     },
        //     exportable: true,
        // }

        const sendParam = automatableNumberSynthParam(
            send.gain, 'Send level', 0, 1
        );
        const dryParam: NumberSynthParam = automatableNumberSynthParam(
            dry.gain, 'Dry level', 0, 1
        );

        this.params = [
            // sampleChoiceDefinition,
            sendParam,
            dryParam,
            dcOffsetRemoverParam,
        ];

        this.enable = async () => {
            // sampleChoiceDefinition.value = 0;
            this.markReady();
        }
        this.disable = () => {
        }
        const parent = this;
    }
}
