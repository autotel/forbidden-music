import { EventParamsBase, Synth } from "./super/Synth";

export class PlaceholderSynth extends Synth<EventParamsBase> {
    input: AudioNode;
    constructor(audioContext: AudioContext) {
        super(audioContext);
        this.input = this.output;
    }
}
