// things that can be dragged, selected in group, deleted, etc.

import { Loop, loop } from "./Loop";
import { Note, note } from "./Note";

export enum TraceType {
    Note,
    Loop,
}


export const cloneTrace = <T extends Trace>(trace: T): T => {
    switch (trace.type) {
        case TraceType.Note:
            return note(trace) as T;
        case TraceType.Loop:
            return loop(trace) as T;
    }
}


export type Trace = Note | Loop;