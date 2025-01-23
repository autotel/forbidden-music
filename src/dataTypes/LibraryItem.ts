import { SynthChainDefinition, SynthChannelsDefinition } from "@/dataStructures/synthStructureFunctions";
import { SynthParamStored } from "../synth/types/SynthParam";
import { AutomationLane } from "./AutomationLane";
import { AutomationPointDef } from "./AutomationPoint";
import { LoopDef } from "./Loop";
import { NoteDef } from "./Note";
export const currentProjectVersion = "0.5.0";
export const LIBRARY_VERSION = currentProjectVersion;

export interface LibraryItem_0_1_0 {
    version: string;
    name: string;
    notes: Array<{ [key: string]: number | false } & { groupId: number }>;
    created: Number;
    edited: Number;
    snaps: Array<[string, boolean]>;
    instrument?: {
        type: string;
        params: Array<SynthParamStored>;
    };
    bpm?: number;
}

export interface LibraryItem_0_2_0 extends LibraryItem_0_1_0 {
    layers: {
        channelSlot: number;
        visible: boolean;
        locked: boolean;
    }[];
    channels: {
        type: string;
        params: Array<SynthParamStored>;
    }[];
    customOctavesTable?: number[];
    snap_simplify?: number;
}


export interface LibraryItem_0_3_0 {

    version: string;
    name: string;
    created: Number;
    edited: Number;
    snaps: Array<[string, boolean]>;
    instrument?: {
        type: string;
        params: Array<SynthParamStored>;
    };
    bpm?: number;


    layers: {
        channelSlot: number;
        visible: boolean;
        locked: boolean;
    }[];
    channels: {
        type: string;
        params: Array<SynthParamStored>;
    }[];
    customOctavesTable?: number[];
    snap_simplify?: number;

    notes: NoteDef[];
    loops: LoopDef[];
    automations?: AutomationPointDef[];
}

export interface LibraryItem_0_4_0 {

    version: string;
    name: string;
    created: Number;
    edited: Number;
    snaps: Array<[string, boolean]>;
    instrument?: {
        type: string;
        params: Array<SynthParamStored>;
    };
    bpm?: number;
    layers: {
        channelSlot: number;
        visible: boolean;
        locked: boolean;
    }[];
    channels: {
        type: string;
        params: Array<SynthParamStored>;
    }[];
    customOctavesTable?: number[];
    snap_simplify?: number;

    notes: NoteDef[];
    loops: LoopDef[];
    lanes: AutomationLane[];
}

export interface LibraryItem_0_5_0 {

    version: string;
    name: string;
    created: Number;
    edited: Number;
    snaps: Array<[string, boolean]>;
    bpm?: number;
    layers: {
        channelSlot: number;
        visible: boolean;
        locked: boolean;
        name?: string;
    }[];
    
    channels: SynthChannelsDefinition;
    masterEffects: SynthChainDefinition;

    customOctavesTable?: number[];
    snap_simplify?: number;

    notes: NoteDef[];
    loops: LoopDef[];
    lanes: AutomationLane[];
}

export type OldFormatLibraryItem =
    LibraryItem_0_1_0 |
    LibraryItem_0_2_0 |
    LibraryItem_0_3_0 |
    LibraryItem_0_4_0;

export type LibraryItem = LibraryItem_0_5_0;