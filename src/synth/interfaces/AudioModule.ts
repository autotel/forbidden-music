import { SynthParam } from "./SynthParam";
import { PatcheableTrait, PatcheableType } from "../../dataTypes/PatcheableTrait";
import { EventParamsBase, SynthVoice } from "../super/Synth";

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
    stop: () => void;
    output: GainNode;
}


