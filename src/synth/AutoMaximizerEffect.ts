import { EffectInstance, SynthInstance, SynthParam } from "./SynthInterface";
import { createMaximizerWorklet } from "../functions/maximizerWorkletFactory";
export class AutoMaximizerEffect implements EffectInstance {
    outputNode: GainNode;
    inputNode: GainNode;
    name: string = "AutoMaximizer";
    enable: () => void;
    disable: () => void;
    constructor(
        audioContext: AudioContext,
    ) {
        audioContext;

        this.outputNode = audioContext.createGain();
        this.inputNode = audioContext.createGain();
        this.inputNode.connect(this.outputNode);

        let maximizer: AudioNode | undefined;

        this.enable = async () => {
            if(!maximizer) {
                // TODO: move maximizer to an fx, and remove it from here
                maximizer = await createMaximizerWorklet(audioContext);
            }
            this.inputNode.disconnect();
            maximizer.connect(this.outputNode);
            this.inputNode.connect(maximizer);
        }
        this.disable = () => {
        }

    }
    params = [] as SynthParam[];
}
