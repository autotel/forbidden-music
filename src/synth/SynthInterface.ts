export interface AudioModule {
    name: string,
    params: SynthParam[],
    enable: () => void,
    disable: () => void,
    credits?: string,
}
export interface ExternalSynthInstance extends AudioModule {
    triggerAttackRelease: (
        frequency: number,
        duration: number,
        /** absolute note start time, in web audio api time */
        absoluteNoteStart: number,
        velocity: number,
        noteStartedTimeAgo?: number
    ) => void,
    triggerPerc: (
        frequency: number,
        /** absolute note start time, in web audio api time */
        absoluteNoteStart: number,
        velocity: number,
        noteStartedTimeAgo?: number
    ) => void,
    releaseAll: () => void,
}

export interface SynthInstance extends AudioModule {
    outputNode: AudioNode,
    triggerAttackRelease: (
        frequency: number,
        duration: number,
        /** absolute note start time, in web audio api time */
        absoluteNoteStart: number,
        velocity: number,
        noteStartedTimeAgo?: number
    ) => void,
    triggerPerc: (
        frequency: number,
        /** absolute note start time, in web audio api time */
        absoluteNoteStart: number,
        velocity: number,
        noteStartedTimeAgo?: number
    ) => void,
    releaseAll: () => void,
}

export interface EffectInstance extends AudioModule {
    outputNode: AudioNode,
    inputNode: AudioNode,
}

export enum ParamType {
    number = "number",
    progress = "progress",
    boolean = "boolean",
    option = "option",
    infoText = "info text",
    nArray = "nArray",
}

export type SynthParamStored = {
    displayName: string,
    value: any,
}

export type SynthParamMinimum<T> = {
    displayName: string,
    type: ParamType,
    value: T,
    exportable: boolean,
    [key: string]: any,
}

export interface NumberSynthParam extends SynthParamMinimum<number> {
    type: ParamType.number,
    value: number,
    displayName: string,
    min: number,
    max: number,
    schedule?: (destTime: number, destValue: number) => void,
    animate?: (destTime: number, destValue: number) => void,
    curve?: 'linear' | 'log',
}

export interface ProgressSynthParam extends SynthParamMinimum<number> {
    type: ParamType.progress,
    value: number,
    displayName: string,
    min: number
    max: number
}

export interface BooleanSynthParam extends SynthParamMinimum<boolean> {
    type: ParamType.boolean,
    value: boolean,
    displayName: string,
    schedule?: (destTime: number, destValue: number) => void,
}

export interface OptionSynthParam extends SynthParamMinimum<number> {
    type: ParamType.option,
    /** choice number */
    value: number,
    options: {
        value: string | number,
        displayName: string,
    }[]
    displayName: string,
}

export interface InfoTextSynthParam extends SynthParamMinimum<string> {
    type: ParamType.infoText,
    value: string,
    displayName: string,
}

export interface ArraySynthParam extends SynthParamMinimum<number[]> {
    type: ParamType.nArray,
    value: number[],
    displayName: string,
    updateFlag?: string,
    min: number
    max: number
}


export type SynthParam =
    NumberSynthParam |
    BooleanSynthParam |
    OptionSynthParam |
    InfoTextSynthParam |
    ProgressSynthParam |
    ArraySynthParam

