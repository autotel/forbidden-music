
export interface Group {
    name: string;
    id: number;
    // [time:[start, end], octave:[start, end]]
    bounds: [[number, number], [number, number]]
    selected: boolean;
}

export interface Groupable {
    group?: Group;
}

