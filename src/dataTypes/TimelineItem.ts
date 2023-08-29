export enum SelectableType {
    Note,
    Group,
}

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

export interface VelocityRange {
    velocity: number,
    velocityEnd: number,
}

export type TimeRangeOctaveRange = TimeRange & OctaveRange
export type TimeRangeOctave = TimeRange & OctavePosition
export type TimeRangeVelocityRange = TimeRange & VelocityRange
export type TimeRangeOctaveRangeVelocityRange = TimeRange & OctaveRange & VelocityRange
// ... add as needed

export type TimelineItem = TimeRangeOctaveRange | TimeRangeVelocityRange | TimeRangeOctaveRangeVelocityRange | TimeRangeOctave | TimeRange;

//selectable stuff in the timeline 

export interface Selectable {
    selected: boolean;
    type?: SelectableType;
}

export type TimeRangeOctaveRangeSelectable = TimeRange & OctaveRange & Selectable;
export type TimeRangeOctaveSelectable = TimeRange & OctavePosition & Selectable;
export type TimeOctaveRangeSelectable = TimePosition & OctaveRange & Selectable;
export type TimeOctaveSelectable = TimePosition & OctavePosition & Selectable;

export type TimelineSelectableItem = TimeRangeOctaveRangeSelectable | TimeRangeOctaveSelectable | TimeOctaveRangeSelectable | TimeOctaveSelectable;
