import { createMaximizerWorklet } from "../functions/maximizerWorkletFactory";
import { AudioModule } from "./interfaces/AudioModule";

export class AutoMaximizerEffect extends AudioModule {
    output: GainNode;
    input: GainNode;
    constructor(
        audioContext: AudioContext,
    ) {
        super();
        audioContext;

        this.output = audioContext.createGain();
        this.input = audioContext.createGain();
        this.input.connect(this.output);

        let maximizer: AudioNode | undefined;

        this.enable = async () => {
            if(!maximizer) {
                maximizer = await createMaximizerWorklet(audioContext);
            }
            this.input.disconnect();
            maximizer.connect(this.output);
            this.input.connect(maximizer);
        }
        this.disable = () => {
        }

    }
}
