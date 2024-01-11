# Trace

Defines an object which is located in the timeline.

Some examples of a trace:
* [Note](./Note.md)
* [AutomationPoint](./AutomationPoint.md)
* [Loop](./Loop.md)

Traces are not used as class instance, but rather as native objects. In order to manipulate these, external functions are used. 

## Trace manipulation functions

### cloneTrace

Provides a copy of whichever trace is provided in the parameter.

```typescript
const loop = loop({
    time: 0,
    duration: 1,
    count: 4
})
const newLoop = cloneTrace (loop)
```

## Traces and trace definitions

Differences between trace and trace definitions:

* Traces are part of the opened project, and operate as the 'living' traces. Trace definitions are intended for storing and loading.
* Different trace instances can be provided as parameter in the many functions that manipulate traces, whereas trace definitions might be incompatible.
* Trace definitions can take few different shapes; for example a note definition can either define octave or frequency, but a note strictly defines octave.

Contents of Loop.ts to illustrate the differences

``` typescript
import Draggable from "./Draggable";
import Selectable from "./Selectable";
import { TimeRange } from "./TimelineItem";
import { TraceType } from "./Trace";

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
```
