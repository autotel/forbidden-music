import { SynthParam } from "./SynthParam";

export interface AudioModule {
    params: SynthParam[],
    name?: string,
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
    needsFetching?: boolean,
    output?: AudioNode,
    input?: AudioNode,
}


export interface AudioEffect extends AudioModule {
    output: AudioNode,
    input: AudioNode,
}
