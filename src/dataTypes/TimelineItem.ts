//stuff placed in timeline

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

export const getDuration = (timeRange: TimeRange): number => {
    if (timeRange.timeEnd < timeRange.time) {
        console.warn('timeRange has negative duration', timeRange);
        sanitizeTimeRanges(timeRange);
    }
    return timeRange.timeEnd - timeRange.time;
}

export const hasDuration = (timeRange: TimeRange): boolean => {
    return timeRange.timeEnd !== timeRange.time;
}