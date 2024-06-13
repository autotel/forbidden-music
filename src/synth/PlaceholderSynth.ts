import { EventParamsBase, Synth } from "./super/Synth";

export class PlaceholderSynth extends Synth<EventParamsBase> {
    constructor(audioContext: AudioContext) {
        super(audioContext);
    }
}
