import { AsyncEnableObject } from "@/dataTypes/AsyncEnableObject";
import { PatcheableTrait, PatcheableType } from "../../dataTypes/PatcheableTrait";
import { EventParamsBase, SynthVoice } from "./Synth";
import { SynthParam } from "./SynthParam";


export class AudioModule implements PatcheableTrait, AsyncEnableObject {
    // PatcheableTrait
    readonly patcheableType = PatcheableType.AudioModule;

    // AsyncEnableObject
    waitReady: Promise<void>;
    markReady: () => void;

    // AudioModule
    name: string = "AudioModule";
    params: SynthParam[] = [];
    output?: AudioNode;
    input?: AudioNode;
    /**
     * The disabling mechanism is not well thought around the app 
     * generally don't use synths that've been disabled.
     * There will be no clear warning if such is done.
     */
    disable = () => { };
    enable = () => {
        this.markReady();
    };
    findParamByName = (name: string): SynthParam | undefined => {
        return AudioModule.findParamByName(this, name);
    }

    needsFetching?: boolean;
    credits?: string;

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

    constructor() {
        this.markReady = () => { throw new Error("MarkReady incorrectly set") };
        this.waitReady = new Promise<void>((resolve) => {
            this.markReady = resolve;
        });
    }
}


export interface ReceivesNotes extends AudioModule {
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


