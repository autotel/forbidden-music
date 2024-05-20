import { SynthParam } from "./SynthParam";

export interface AudioModule {
    name: string,
    params: SynthParam[],
    /**
     * in case a synth needs to do operations before first note is played
     * such as loading samples, calculating something, etc.
     */
    enable: () => void,
    /**
     * in case a synth can free memory when not in use
     */
    disable: () => void,
    credits?: string,
}


export interface EffectInstance extends AudioModule {
    output: AudioNode,
    inputNode: AudioNode,
}
