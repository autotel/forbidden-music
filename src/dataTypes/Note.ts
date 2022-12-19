import { TimedEvent } from "./TimedEvent";

export interface Note extends TimedEvent {
    start: number,
    duration: number,
    octave: number,
    end?: number,
}