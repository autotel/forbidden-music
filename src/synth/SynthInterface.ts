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


export interface SynthVoice<EventParamsTpl> {
    output: AudioNode;
    inUse: boolean;
    scheduleStart: (
        frequency: number,
        absoluteStartTime: number,
        /** parameters unique to this triggered event, such as velocity and whatnot */
        noteParameters: EventParamsTpl
    ) => {};
    scheduleEnd: (
        absoluteStopTime: number,
    ) => {}
    stop: () => void,
}
export type synthVoiceFactory<
    VoiceType extends SynthVoice<EventParamsType>,
    EventParamsType
> = (audioContext: AudioContext) => VoiceType;

export interface SynthInstance<
    SynthVoiceTpl extends SynthVoice<TParamTpl>,
    TParamTpl,
> extends AudioModule {
    output: AudioNode,
    scheduleStart: (
        frequency: number,
        absoluteStartTime: number,
        noteParameters: TParamTpl
    ) => SynthVoiceTpl,
    schedulePerc: (
        frequency: number,
        absoluteStartTime: number,
        noteParameters: TParamTpl
    ) => SynthVoiceTpl,
    stop: () => void,
}

export interface EffectInstance extends AudioModule {
    output: AudioNode,
    inputNode: AudioNode,
}

export enum ParamType {
    number = "number",
    progress = "progress",
    boolean = "boolean",
    option = "option",
    infoText = "info text",
    nArray = "nArray",
    readout = "readout",
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


export interface ReadoutSynthParam extends SynthParamMinimum<string> {
    type: ParamType.readout,
    displayName: string,
}

export interface NumberSynthParam extends SynthParamMinimum<number> {
    type: ParamType.number,
    value: number,
    displayName: string,
    min: number,
    max: number,
    default?: number,
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
    default?: boolean,
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
    default?: number
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
    min: number,
    max: number,
    default?: number[],
}


export type SynthParam =
    NumberSynthParam |
    BooleanSynthParam |
    OptionSynthParam |
    InfoTextSynthParam |
    ProgressSynthParam |
    ReadoutSynthParam |
    ArraySynthParam

