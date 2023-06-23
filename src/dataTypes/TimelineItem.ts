export interface Selectable {
    selected: boolean;
}

export interface TimeRangeOctaveRangeSelectable extends Selectable{
    selected: boolean;
    time: number;
    timeEnd: number;
    octave: number;
    octaveEnd: number;
}
export interface TimeRangeOctaveSelectable extends Selectable{
    selected: boolean;
    time: number;
    timeEnd: number;
    octave: number;
}
export interface TimeOctaveRangeSelectable extends Selectable{
    selected: boolean;
    time: number;
    octave: number;
    octaveEnd: number;
}
export interface TimeOctaveSelectable extends Selectable{
    selected: boolean;
    time: number;
    octave: number;
}

export type TimelineItem = TimeRangeOctaveRangeSelectable | TimeRangeOctaveSelectable | TimeOctaveRangeSelectable | TimeOctaveSelectable;
