import { AudioModule } from "../types/AudioModule";
import { automatableNumberSynthParam } from "../types/Automatable";
import {  SynthParam } from "../types/SynthParam";

export class GainEffect extends AudioModule {
    output: GainNode;
    input: GainNode;
    params: SynthParam[];

    constructor(
        audioContext: AudioContext,
    ) {
        super();
        this.input = this.output = audioContext.createGain();

        this.params = [
            automatableNumberSynthParam(this.output.gain, 'gain', 0, 10),
        ];

    }
}
