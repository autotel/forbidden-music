// things that can be dragged, selected in group, deleted, etc.

import isDev from "../functions/isDev";
import { Loop, loop } from "./Loop";
import { Note, note } from "./Note";
import { AutomationPoint, automationPoint } from "./AutomationPoint";

export enum TraceType {
    None,
    Note,
    Loop,
    AutomationPoint,
}

export type Trace = Note | Loop | AutomationPoint;

export const cloneTrace = <T extends Trace>(trace: T): T => {
    switch (trace.type) {
        case TraceType.Note:
            return note(trace) as T;
        case TraceType.Loop:
            return loop(trace) as T;
        case TraceType.AutomationPoint:
            return automationPoint(trace) as T;
        default:
            throw new Error(`Unknown trace type ${JSON.stringify(trace)}`);
    }
}

export const traceTypeSafetyCheck = isDev() ? (trace: Trace) => {
    // return trace.type;
    // @ts-ignore
    if (!trace.type) throw new Error("trace type is " + TraceType[trace.type] ?? trace.type)
} : () => { };


export const transposeTime = <T extends Trace>(trace: T, time: number): T => {
    trace.time += time;
    if('timeEnd' in trace) trace.timeEnd += time;
    return trace;
}
