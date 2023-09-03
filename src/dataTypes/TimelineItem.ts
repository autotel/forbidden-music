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

export const sanitizeTimeRanges = (... items: TimeRange[]) => {
    items.forEach(item => {
        if (item.timeEnd < item.time) {
            item.timeEnd = item.time;
        }
    });
}