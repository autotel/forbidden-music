import { SynthParam } from "./SynthParam";
import { PatcheableTrait, PatcheableType } from "../../dataTypes/PatcheableTrait";
import { EventParamsBase, SynthVoice } from "./Synth";

export class AudioModule implements PatcheableTrait {
    readonly patcheableType = PatcheableType.AudioModule;
    params: SynthParam[] = [];
    name: string = "AudioModule";
    credits?: string;
    needsFetching?: boolean;
    output?: AudioNode;
    input?: AudioNode;
    enable: false | (() => void) = false;
    disable: false | (() => void) = false;
    waitReady?: Promise<void>;  
    findParamByName = (name: string): SynthParam | undefined => {
        return AudioModule.findParamByName(this, name);
    }
    
    static findParamByName = (synth: AudioModule, name: string): SynthParam | undefined => {
        // console.log("           finding param", name, "in", synth);
        const exact = synth.params.find((param) => {
            // console.log("               param", param.displayName, param.displayName === name ? "==" : "!=", name);
            return param.displayName === name
        });
        if (exact) return exact;
        const similar = synth.params.find((param) => param.displayName?.includes(name));
        if (similar) return similar;
        const abbrevName = name.slice(0, 5);
        const abbreviated = synth.params.find((param) => {
            if (!param.displayName) return false;
            return param.displayName.includes(abbrevName)
        });
        return abbreviated;
    }
}


export interface ReceivesNotes extends AudioModule {
    // enable: () => void;
    // disable: () => void;
    // params: SynthParam[];
    // isReady: boolean;
    receivesNotes: true;
    transformTriggerParams?: (p: EventParamsBase) => EventParamsBase;
    scheduleStart: (
        frequency: number,
        absoluteStartTime: number,
        noteParameters: EventParamsBase
    ) => SynthVoice;
    schedulePerc: (
        frequency: number,
        absoluteStartTime: number,
        noteParameters: EventParamsBase
    ) => SynthVoice;
    scheduleEnd: (when?: number) => void;
    output: GainNode;
}


