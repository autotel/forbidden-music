export interface SynthInstance {
    set: (params: any) => void;
    triggerAttackRelease: (
        frequency: number,
        duration: number,
        relativeNoteStart: number,
        velocity: number
    ) => void;
    releaseAll: () => void;

}

export interface SynthParam {
    getter: () => number;
    setter: (n: number) => void;
    displayName: string;
    min: number
    max: number
}

export interface SynthInterface {
    synth: SynthInstance | undefined;
    init: (audioContext:AudioContext) => [SynthInstance, AudioContext];
    getParams: () => Promise<SynthParam[]>
}