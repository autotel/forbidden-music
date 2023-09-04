// things that can be dragged, selected in group, deleted, etc.

import isDev from "../functions/isDev";
import { Loop, loop } from "./Loop";
import { Note, note } from "./Note";

export enum TraceType {
    None,
    Note,
    Loop,
}


export const cloneTrace = <T extends Trace>(trace: T): T => {
    switch (trace.type) {
        case TraceType.Note:
            return note(trace) as T;
        case TraceType.Loop:
            return loop(trace) as T;
        default:
            throw new Error(`Unknown trace type ${JSON.stringify(trace)}`);
    }
}

export const traceTypeSafetyCheck = isDev() ? (trace: Trace) => {
    // @ts-ignore
    if (!trace.type) throw new Error("trace type is " + TraceType[trace.type] ?? trace.type)
} : () => { };
export type Trace = Note | Loop;