
import { TimelineItem, TimeRangeOctaveRangeSelectable } from "./TimelineItem";

export class Group implements TimeRangeOctaveRangeSelectable {
    name: string;
    id: number;

    selected: boolean;

    time: number;
    timeEnd: number;
    octave: number;
    octaveEnd: number;

    constructor(name?: string, id?: number, position?: TimelineItem) {
        this.name = name || "unnamed group";
        this.id = id || 0;
        this.selected = false;
        this.time = position?.time || 0;
        this.octave = position?.octave || 0;
        if (position && 'timeEnd' in position) {
            this.timeEnd = position.timeEnd;
        } else {
            this.timeEnd = this.time;
        }
        if (position && 'octaveEnd' in position) {
            this.octaveEnd = position.octaveEnd;
        } else {
            this.octaveEnd = this.octave;
        }
    }

    setBounds(timeRange: [number, number], octaveRange: [number, number]) {
        this.time = timeRange[0];
        this.timeEnd = timeRange[1];
        this.octave = octaveRange[0];
        this.octaveEnd = octaveRange[1];
    }
}

export interface Groupable {
    group?: Group;
}

