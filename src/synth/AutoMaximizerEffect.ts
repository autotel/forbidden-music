import { EffectInstance, SynthInstance, SynthParam } from "./SynthInterface";
import { createMaximizerWorklet } from "../functions/maximizerWorkletFactory";
export class AutoMaximizerEffect implements EffectInstance {
    output: GainNode;
    inputNode: GainNode;
    name: string = "AutoMaximizer";
    enable: () => void;
    disable: () => void;
    constructor(
        audioContext: AudioContext,
    ) {
        audioContext;

        this.output = audioContext.createGain();
        this.inputNode = audioContext.createGain();
        this.inputNode.connect(this.output);

        let maximizer: AudioNode | undefined;

        this.enable = async () => {
            if(!maximizer) {
                // TODO: move maximizer to an fx, and remove it from here
                maximizer = await createMaximizerWorklet(audioContext);
            }
            this.inputNode.disconnect();
            maximizer.connect(this.output);
            this.inputNode.connect(maximizer);
        }
        this.disable = () => {
        }

    }
    params = [] as SynthParam[];
}
