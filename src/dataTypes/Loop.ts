import Draggable from "./Draggable";
import Selectable from "./Selectable";
import { TimeRange } from "./TimelineItem";
import { Trace, TraceType } from "./Trace";

export type LoopDefA = {
    time: number;
    timeEnd: number;
    count?: number;
    timesLeft?: number;
}

export type LoopDefB = {
    time: number;
    duration: number;
    count?: number;
    timesLeft?: number;
}

export type LoopDef = LoopDefA;

export type Loop = TimeRange & Selectable & Draggable & {
    type: TraceType.Loop;
    count: number;
    repetitionsLeft?: number;
}

export const loop = (loopDef: LoopDefA | LoopDefB | Loop): Loop => {
    const deductedEnd = 'duration' in loopDef ? loopDef.time + loopDef.duration : loopDef.timeEnd;
    return {
        type: TraceType.Loop,
        time: loopDef.time,
        timeEnd: deductedEnd,
        count: loopDef.count === undefined ? Infinity : loopDef.count,
    }
}

export const loopDef = (loop: Loop): LoopDef => {
    const ret: LoopDef = {
        time: loop.time,
        timeEnd: loop.timeEnd,
        count: loop.count,
    };
    if (loop.count === Infinity) delete ret.count;
    return ret;
}