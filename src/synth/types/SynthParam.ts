import { PatcheableSynthVoice } from "./Synth"
import { AudioModule } from "./AudioModule"

export enum ParamType {
    other = "other",
    number = "number",
    progress = "progress",
    boolean = "boolean",
    option = "option",
    infoText = "info text",
    nArray = "nArray",
    readout = "readout",
    voicePatch = "voicePatch",
}

export type SynthParamStored = {
    displayName?: string,
    value: any,
}

export type SynthParamMinimum<T> = {
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
    displayValue?: string,
    min: number,
    max: number,
    default?: number,
    curve?: 'linear' | 'log',
    schedule?: (destTime: number, destValue: number) => void,
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
    default?: boolean,
}

export interface OtherSynthParam extends SynthParamMinimum<any> {
    displayName: string,
    type: ParamType.other,
}

type OptionDef = {
    value: string | number,
    displayName: string,
}

export interface OptionSynthParam extends SynthParamMinimum<number> {
    type: ParamType.option,
    /** choice number */
    value: number,
    options: OptionDef[]
    displayName?: string,
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

type PatchedVoiceDef = {
    type: string,
    factory: () => PatcheableSynthVoice | AudioModule,
    params: SynthParam[]
}

type VoicePatch = PatchedVoiceDef[]

export interface VoicePatchSynthParam extends SynthParamMinimum<VoicePatch> {
    type: ParamType.voicePatch,
    value: VoicePatch,
}
export const isValidParamType = (paramType: String) => {
    return (<any>Object).values(ParamType).includes(paramType)
}
const hasAllTheProps = (param: any, props: string[], report = true): boolean => {
    const ret = props.every(prop => prop in param)
    if (ret) {
        return ret;
    } else if (report) {
        console.log(param, "missing props: ", props.filter(prop => !(prop in param)));
    }
    return false;
}
/** not exhaustive */
export const isValidParam = (param: unknown): param is SynthParam => {
    if (!hasAllTheProps(param, ['type', 'value'])) return false
    // @ts-ignore
    if (!('type' in param)) return false;
    // @ts-ignore
    switch (param.type) {
        case ParamType.number:
            return hasAllTheProps(param, ['type', 'value', 'displayName', 'min', 'max'])
        case ParamType.progress:
            return hasAllTheProps(param, ['type', 'value', 'displa<yName', 'min', 'max'])
        case ParamType.boolean:
            return hasAllTheProps(param, ['type', 'value', 'displayName'])
        case ParamType.option:
            return hasAllTheProps(param, ['type', 'value', 'options', 'displayName'])
        case ParamType.infoText:
            return hasAllTheProps(param, ['type', 'value', 'displayName'])
        case ParamType.nArray:
            return hasAllTheProps(param, ['type', 'value', 'displayName', 'min', 'max'])
        case ParamType.readout:
            return hasAllTheProps(param, ['type', 'value', 'displayName'])
        case ParamType.voicePatch:
            return hasAllTheProps(param, ['type', 'value'])
        default:
            console.log("invalid but present param type prop in ", param)
    }
    return false;
}

export type SynthParam =
    NumberSynthParam |
    BooleanSynthParam |
    OptionSynthParam |
    InfoTextSynthParam |
    ProgressSynthParam |
    ReadoutSynthParam |
    ArraySynthParam |
    OtherSynthParam |
    VoicePatchSynthParam




export function numberSynthParam(
    targetParam: AudioParam,
    displayName?: string,
    min?: number,
    max?: number,
    exportable = true,
    automatable = true,
): NumberSynthParam {
    displayName = displayName || Object.prototype.toString.call(targetParam);

    min = (undefined === min) ? targetParam.minValue : min;
    max = (undefined === max) ? targetParam.maxValue : max;

    const synthParam = {
        type: ParamType.number,
        _v: targetParam.value,
        get value() {
            return targetParam.value;
        },
        set value(v: number) {
            targetParam.value = v;
        },
        min,
        max,
        displayName,
        exportable,
    } as NumberSynthParam;
    if (automatable) {
        synthParam.animate = (startTime: number, destTime: number, destValue: number) => {
            targetParam.linearRampToValueAtTime(destValue, destTime);
        };
        synthParam.stopAnimations = (startTime: number = 0) => {
            targetParam.cancelScheduledValues(startTime || 0);
        };
    }
    return synthParam;
}

export const castToOptionDefList = (optionsList: (OptionDef | string)[]): OptionDef[] => {
    return optionsList.map(opt => typeof opt === 'string' ? { value: opt, displayName: opt } : opt)
}

export function optionSynthParam(
    targetNode: AudioNode,
    targetParamName: string,
    optionsList: (OptionDef | string)[],
    displayName?: string,
    exportable = true,
): OptionSynthParam {
    displayName = displayName || targetParamName;
    if (!(targetParamName in targetNode)) {
        throw new Error(`targetNode does not have a property named ${targetParamName}`);
    }
    // @ts-ignore
    const currentParamValue: string = targetNode[targetParamName];
    const options = castToOptionDefList(optionsList);
    let currentValueIndex = options.findIndex(opt => opt.value === currentParamValue);
    if (currentValueIndex === -1) {
        currentValueIndex = 0;
    }
    const setter = (v: number) => {
        // @ts-ignore
        targetNode[targetParamName] = options[v].value as string;
    }
    const synthParam = {
        type: ParamType.option,
        _v: currentValueIndex,
        get value() {
            return currentValueIndex;
        },
        set value(v: number) {
            setter(v);
            currentValueIndex = v;
        },
        options,
        displayName,
        exportable,
    } as OptionSynthParam;
    return synthParam;
}