import { NumberSynthParam, ParamType, SynthParam } from "./SynthParam";

export type CurrentTweenDef = {
    time: number | false;
    timeEnd: number | false;
    valueEnd: number;
    value: number;
}

export type NotAnimatedValue = {
    /** value at the time */
    value: number;
}

export interface AutomatableSynthParam extends NumberSynthParam {
    currentTween?: CurrentTweenDef;
    /**
     * animate to a value at a time
     * @param startTime time when the animation started
     * @param destTime time when the animation should end
     * @param destValue value to animate to
     */
    animate: (startTime: number, destTime: number, destValue: number) => void;
    stopAnimations: (startTime?: number) => void;
}

/**
 * helper to add single automation point, causing the expected side effects to the parameter
 * Since a single point is provided, it assumes that said animation starts from the last tween.
 * @param param parameter to automate
 * @param timeDest time to animate to
 * @param destValue value to animate to
 */
export function addAutomationDestinationPoint(param: AutomatableSynthParam, timeDest: number, destValue: number) {
    const currentTween = param.currentTween;
    const animationStarted = currentTween?.timeEnd || timeDest;
    const valueStarted = currentTween?.valueEnd || param.value;
    param.animate(animationStarted, timeDest, destValue);
    param.currentTween = {
        time: animationStarted,
        timeEnd: timeDest,
        value: valueStarted,
        valueEnd: destValue,
    }
}

export function stopAndResetAnimations(param: AutomatableSynthParam) {
    param.stopAnimations();
    delete param.currentTween;
}
/**
 * a tween cutter
 * assuming a linear tween that might've started some time ago, get the value at
 * a time (assumingly now or soon) and what target time and values to animate
 * to next
 */
export function getTweenSlice(param: AutomatableSynthParam, fromTime: number): CurrentTweenDef | NotAnimatedValue {
    const currentTween = param.currentTween;
    if (!currentTween || !currentTween.time || !currentTween.timeEnd) {
        return {
            value: param.value,
        }
    }

    const { time, timeEnd, valueEnd, value } = currentTween;

    if (fromTime < time) {
        return {
            value: value,
        }
    }
    if (fromTime > timeEnd) {
        return {
            value: valueEnd,
        }
    }
    return {
        get value() {
            const totalTweenDuration = timeEnd - time;
            const remainingTweenDuration = timeEnd - fromTime;
            const lerpVal = totalTweenDuration / remainingTweenDuration;
            const totalValueChange = valueEnd - value;
            return value + totalValueChange * lerpVal;
        },
        valueEnd, timeEnd,
        time: fromTime,
    }
}


const _isAutomatable = (param: SynthParam): param is AutomatableSynthParam => {
    return 'animate' in param;// && typeof param.animate === 'function';
}

export function isAutomatable(param: SynthParam): AutomatableSynthParam | false {
    return _isAutomatable(param) ? param : false;
}
const accessProp = <T, K extends keyof T>(obj: T, key: K) => obj[key];
const isValidAudioParam = (param: unknown): param is AudioParam => {
    return param instanceof AudioParam;
}
export function createAutomatableAudioNodeParam(
    targetParam: AudioParam,
    displayName?: string,
    min?: number,
    max?: number,
    exportable = true,
): AutomatableSynthParam & NumberSynthParam {
    displayName = displayName || Object.prototype.toString.call(targetParam);

    min = (undefined === min) ? targetParam.minValue : min;
    max = (undefined === max) ? targetParam.maxValue : max;

    const automatableParam = {
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
        animate(startTime: number, destTime: number, destValue: number) {
            targetParam.linearRampToValueAtTime(destValue, destTime);
        },
        stopAnimations(startTime: number = 0) {
            targetParam.cancelScheduledValues(startTime || 0);
        },
        exportable,
    } as NumberSynthParam & AutomatableSynthParam;
    return automatableParam;
}