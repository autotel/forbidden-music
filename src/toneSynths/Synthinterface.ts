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

export enum ParamType {
    number = "number",
    boolean = "boolean",
    option = "option",
}

export interface NumberSynthParam {
    type: ParamType.number;
    getter: () => number;
    setter: (n: number) => void;
    displayName: string;
    min: number
    max: number
}

export interface BooleanSynthParam {
    type: ParamType.boolean;
    getter: () => boolean;
    setter: (b: boolean) => void;
    displayName: string;
}

interface OptionOption {
    value: string | number;
    displayName: string;
}

export interface OptionSynthParam {
    type: ParamType.option;
    getter: () => number;
    setter: (optionIndex: number) => void;
    options: OptionOption[]
    displayName: string;
}

export type SynthParam = NumberSynthParam | BooleanSynthParam | OptionSynthParam;

export interface SynthInterface {
    synth: SynthInstance | undefined;
    init: (audioContext:AudioContext) => [SynthInstance, AudioContext];
    getParams: () => Promise<SynthParam[]>
}