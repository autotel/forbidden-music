//stuff placed in timeline

import { Trace } from "./Trace";

export interface TimePosition {
    time: number;
}

export interface TimeRange {
    time: number,
    timeEnd: number,
}

export interface OctavePosition {
    octave: number;
}

export interface OctaveRange {
    octave: number,
    octaveEnd: number,
}

export interface VelocityPosition {
    velocity: number,
}

export interface ValuePosition {
    value: number,
}

export interface VelocityRange {
    velocity: number,
    velocityEnd: number,
}

export const sanitizeTimeRanges = (...items: TimeRange[]) => {
    items.forEach(item => {
        if (item.timeEnd < item.time) {
            item.timeEnd = item.time;
        }
    });
}

export const getDuration = (timeRange: Trace): number => {
    if (!('timeEnd' in timeRange)) {
        return 0;
    }
    if (timeRange.timeEnd < timeRange.time) {
        return 0;
    }
    return timeRange.timeEnd - timeRange.time;
}

export const hasDuration = (timeRange: Trace): boolean => {
    if (!('timeEnd' in timeRange)) {
        return false;
    }
    return timeRange.timeEnd !== timeRange.time;
}