import { NumberSynthParam, SynthParam } from "./SynthParam";

export interface AutomatableSynthParam extends NumberSynthParam {
    animate: (destTime: number, destValue: number) => void;
}


const _isAutomatable = (param: SynthParam): param is AutomatableSynthParam => {
    return 'animate' in param;// && typeof param.animate === 'function';
}

export function isAutomatable(param: SynthParam): AutomatableSynthParam | false {
    return _isAutomatable(param)? param: false;
}