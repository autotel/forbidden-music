import { Note } from '../dataTypes/Note';
import { Trace } from '../dataTypes/Trace';
// TODO: rename and move these
import { SelectableRange } from '../store/selectStore';
export const getNotesInRange = (
    notes: Note[],
    range: SelectableRange
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
        const timeInRange = editNote.timeEnd >= timeStart && editNote.time <= timeEnd;
        return octaveInRange && timeInRange;
    });
};

export const getTracesInRange = (
    traces: Trace[],
    range: SelectableRange
) => {
    // range is expected to come in positive ranges
    const timeStart = range.time;
    const timeEnd = range.timeEnd;
    const octaveStart = 'octave' in range ? range.octave : undefined;
    const octaveEnd = 'octaveEnd' in range ? range.octaveEnd : undefined;

    return traces.filter((editNote) => {
        const octaveInRange = (octaveStart === undefined)
            || !('octave' in editNote)
            || (editNote.octave >= octaveStart && editNote.octave <= octaveEnd!);
        const timeInRange = editNote.timeEnd >= timeStart && editNote.time <= timeEnd;
        return octaveInRange && timeInRange;
    });
};
