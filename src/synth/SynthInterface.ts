
export interface SynthInstance {
    name: any;
    triggerAttackRelease: (
        frequency: number,
        duration: number,
        relativeNoteStart: number,
        velocity: number
    ) => void;
    triggerPerc: (
        frequency: number,
        relativeNoteStart: number,
        velocity: number
    ) => void;
    releaseAll: () => void;
    params: SynthParam[];
    enable: () => void;
    disable: () => void;
    credits?: string;

}

export enum ParamType {
    number = "number",
    boolean = "boolean",
    option = "option",
    infoText = "info text",
    FT = "FT",
}

type SynthParamBasic <T> = {
    displayName: string;
    type: ParamType;
    value: T;
    [key: string]: any;
}

export interface NumberSynthParam extends SynthParamBasic<number> {
    type: ParamType.number;
    value: number;
    displayName: string;
    min: number
    max: number
}

export interface BooleanSynthParam extends SynthParamBasic<boolean> {
    type: ParamType.boolean;
    value: boolean;
    displayName: string;
}

export interface OptionSynthParam extends SynthParamBasic<number> {
    type: ParamType.option;
    /** choice number */
    value: number;
    options: {
        value: string | number;
        displayName: string;
    }[]
    displayName: string;
}

export interface InfoTextSynthParam extends SynthParamBasic<string> {
    type: ParamType.infoText;
    value: string;
    displayName: string;
}

export interface FTSynthParam extends SynthParamBasic<[[][]]> {
    type: ParamType.FT;
    value: [[][]];
    displayName: string;
}


export type SynthParam =
    NumberSynthParam |
    BooleanSynthParam |
    OptionSynthParam |
    InfoTextSynthParam |
    FTSynthParam;

