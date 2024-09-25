import { Note } from '../dataTypes/Note';
import { Trace } from '../dataTypes/Trace';
// TODO: rename and move these
import { SelectableRange } from '../store/selectStore';

export const getNotesInRange = (
    notes: Note[],
    range: SelectableRange,
    // get notes touching the range, or get only notes fully inside the range
    greedy = false,
) => {
    // range is expected to come in positive ranges
    const timeStart = range.time;
    const timeEnd = range.timeEnd;
    const octaveStart = 'octave' in range ? range.octave : undefined;
    const octaveEnd = 'octaveEnd' in range ? range.octaveEnd : undefined;
    return notes.filter((editNote) => {
        // deemed as in octave range if said restriction is not set
        const octaveInRange = (octaveStart === undefined)
            || (editNote.octave >= octaveStart && editNote.octave <= octaveEnd!);

        let timeInRange = greedy ? (
            editNote.time <= timeEnd && editNote.timeEnd >= timeStart
        ) : (
            editNote.time >= timeStart && editNote.timeEnd <= timeEnd
        );


        return octaveInRange && timeInRange;
    });
};

export const getTracesStartingInRange = <T extends Trace>(
    traces: T[],
    range: SelectableRange,
):T[] =>  {
    // range is expected to come in positive ranges
    const timeStart = range.time;
    const timeEnd = range.timeEnd;
    const octaveStart = 'octave' in range ? range.octave : undefined;
    const octaveEnd = 'octaveEnd' in range ? range.octaveEnd : undefined;
    return traces.filter((trace) => {
        const octaveInRange = (octaveStart === undefined)
            || !('octave' in trace)
            || (trace.octave >= octaveStart && trace.octave <= octaveEnd!);

        const timeInRange = trace.time >= timeStart && trace.time <= timeEnd;
        return octaveInRange && timeInRange;
    });
}


export const getTracesInRange = <T extends Trace>(
    traces: T[],
    range: SelectableRange,
    includePrevAndNext = false,
):T[] =>  {
    // range is expected to come in positive ranges
    const timeStart = range.time;
    const timeEnd = range.timeEnd;
    const octaveStart = 'octave' in range ? range.octave : undefined;
    const octaveEnd = 'octaveEnd' in range ? range.octaveEnd : undefined;
    let firstTraceIndex = false as number | false;
    let lastTraceIndex = false as number | false;
    const filtered = traces.filter((trace, index) => {
        const octaveInRange = (octaveStart === undefined)
            || !('octave' in trace)
            || (trace.octave >= octaveStart && trace.octave <= octaveEnd!);

        const traceTimeEnd = 'timeEnd' in trace ? trace.timeEnd : trace.time;

        const timeInRange = traceTimeEnd >= timeStart && trace.time <= timeEnd;
        const pass = octaveInRange && timeInRange;
        if (pass) {
            if (firstTraceIndex === false) {
                firstTraceIndex = index;
            }
            lastTraceIndex = index;
        }
        return pass;
    });
    if (includePrevAndNext && firstTraceIndex !== false && lastTraceIndex !== false) {
        const prevTrace = traces[firstTraceIndex - 1];
        const nextTrace = traces[lastTraceIndex + 1];
        if (prevTrace) filtered.unshift(prevTrace);
        if (nextTrace) filtered.push(nextTrace);
    }
    return filtered;
};

export const findTraceInRange = <T extends Trace>(
    traces: T[],
    range: SelectableRange,
    includePrevAndNext = false,
) => {
    // range is expected to come in positive ranges
    const timeStart = range.time;
    const timeEnd = range.timeEnd;
    const octaveStart = 'octave' in range ? range.octave : undefined;
    const octaveEnd = 'octaveEnd' in range ? range.octaveEnd : undefined;
    let firstTraceIndex = false as number | false;
    let lastTraceIndex = false as number | false;
    const found = traces.find((trace, index) => {
        const octaveInRange = (octaveStart === undefined)
            || !('octave' in trace)
            || (trace.octave >= octaveStart && trace.octave <= octaveEnd!);

        const traceTimeEnd = 'timeEnd' in trace ? trace.timeEnd : trace.time;

        const timeInRange = traceTimeEnd >= timeStart && trace.time <= timeEnd;
        const pass = octaveInRange && timeInRange;
        if (pass) {
            if (firstTraceIndex === false) {
                firstTraceIndex = index;
            }
            lastTraceIndex = index;
        }
        return pass;
    });
    return found;
};