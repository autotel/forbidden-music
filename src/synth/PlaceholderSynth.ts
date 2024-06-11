import { EventParamsBase, Synth } from "./super/Synth";

export class SynthPlaceholder extends Synth<EventParamsBase> {
    name: string = "None";
    constructor(audioContext: AudioContext) {
        super(audioContext);
    }
}
