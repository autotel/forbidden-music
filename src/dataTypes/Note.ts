import { TimedEvent } from "./TimedEvent";

export interface Note extends TimedEvent {
    /** start in musical time */
    start: number,
    /** duration in musical time */
    duration: number,
    /** note in octaves */
    octave: number,
    /** end, which is not guaranteed be up to date */
    end?: number,
    
}