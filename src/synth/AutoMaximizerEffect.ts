import { createMaximizerWorklet } from "../functions/maximizerWorkletFactory";
import { AudioModule } from "./interfaces/AudioModule";
import { SynthChainStepType } from "./interfaces/SynthChainStep";
import { SynthParam } from "./interfaces/SynthParam";

export class AutoMaximizerEffect implements AudioModule {
    output: GainNode;
    input: GainNode;
    readonly type = SynthChainStepType.AudioModule;
    enable: () => void;
    disable: () => void;
    constructor(
        audioContext: AudioContext,
    ) {
        audioContext;

        this.output = audioContext.createGain();
        this.input = audioContext.createGain();
        this.input.connect(this.output);

        let maximizer: AudioNode | undefined;

        this.enable = async () => {
            if(!maximizer) {
                // TODO: move maximizer to an fx, and remove it from here
                maximizer = await createMaximizerWorklet(audioContext);
            }
            this.input.disconnect();
            maximizer.connect(this.output);
            this.input.connect(maximizer);
        }
        this.disable = () => {
        }

    }
    params = [] as SynthParam[];
}
