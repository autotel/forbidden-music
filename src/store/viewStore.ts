import { defineStore } from 'pinia'
import { computed, ref, Ref, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { useScoreStore } from './scoreStore.js';

// TODO: move editNotes to its own library
export const useViewStore = defineStore("view", () => {
    // const view: Ref<View> = ref(new View(1920, 1080, 1024, 3));
    const octaveOffset = ref(2);
    const timeOffset = ref(0);
    const centerFrequency = ref(440);
    const viewWidthPx = ref(1920);
    const viewHeightPx = ref(1080);
    const viewWidthTime = ref(12);
    const viewHeightOctaves = ref(4);
    /** size of the composition, to use as reference to scroll bounds */
    const scrollBound = ref(2048);
    // TODO integrate this, so that view always zooms to center or mouse pos).
    const _offsetPxX = ref(1920 / 2);
    const _offsetPxY = ref(1080);
    const editNotes = ref([] as Array<EditNote>);
    const score = useScoreStore();

    // watchEffect(() => {
    //     console.log("editNotes changed", editNotes.value);
    //     score.notes = editNotes.value.map(e => e.note);
    // }, { flush: 'post' });
    // TODO: add a enum to select different abstractions of tone.
    // so, if using 12 tet, the text in the note is going to be semitones
    // if even hz, it displays hz, if log, it displays octaves
    // and if rational hz, it would display hz and relationships
    // etc..

    // TODO: Will it recalc every call? if so, we need to cache the result
    const visibleNotes = computed((): Array<EditNote> => {
        //TODO: also filter by octave component
        return editNotes.value.filter(editNote => {
            const note = editNote.note;
            return note.start < timeOffset.value + viewWidthTime.value &&
                note.start + note.duration > timeOffset.value;
        });
    });
    const setTimeOffset = (newTimeOffset: number) => {
        timeOffset.value = newTimeOffset;
    };
    const setTimeOffsetBounds = (timeOffsetBounded: number) => {
        timeOffset.value = boundsToTime(timeOffsetBounded);
    };
    const pxToBounds = (px: number): number => {
        return px / viewWidthPx.value;
    };
    const timeToBounds = (time: number): number => {
        return time / scrollBound.value;
    };
    const boundsToTime = (bounds: number): number => {
        return bounds * scrollBound.value;
    };
    const pxToTime = (time: number): number => {
        return time * viewWidthTime.value / viewWidthPx.value;
    };
    const timeToPx = (px: number): number => {
        return px * viewWidthPx.value / viewWidthTime.value;
    };
    const timeToPxWithOffset = (time: number): number => {
        return timeToPx(time - timeOffset.value);
    };
    const pxToTimeWithOffset = (px: number): number => {
        return pxToTime(px) + timeOffset.value;
    };
    const pxToOctave = (px: number): number => {
        return px * - viewHeightOctaves.value / viewHeightPx.value;
    };
    const octaveToPx = (octave: number): number => {
        return octave * viewHeightPx.value / - viewHeightOctaves.value;
    };
    const pxToOctaveWithOffset = (px: number): number => {
        return pxToOctave(px - _offsetPxY.value) - octaveOffset.value;
    };
    const octaveToPxWithOffset = (octave: number): number => {
        return octaveToPx(octave + octaveOffset.value) + _offsetPxY.value;
    };
    const updateSize = (width: number, height: number) => {
        viewWidthPx.value = width;
        viewHeightPx.value = height;
        _offsetPxX.value = width / 2;
    };
    let isDragging = false;
    return {
        setTimeOffset,
        setTimeOffsetBounds,
        pxToBounds,
        timeToBounds,
        boundsToTime,
        pxToTime,
        timeToPx,
        timeToPxWithOffset,
        pxToTimeWithOffset,
        pxToOctave,
        octaveToPx,
        pxToOctaveWithOffset,
        octaveToPxWithOffset,
        updateSize,

        octaveOffset,
        timeOffset,
        centerFrequency,
        viewWidthPx,
        viewHeightPx,
        viewWidthTime,
        viewHeightOctaves,
        scrollBound,
        _offsetPxX,
        _offsetPxY,
        editNotes,
        visibleNotes,
    }
});

export interface View {
    setTimeOffset: (newTimeOffset: number) => void;
    setTimeOffsetBounds: (timeOffsetBounded: number) => void;
    pxToBounds: (px: number) => number;
    timeToBounds: (time: number) => number;
    boundsToTime: (bounds: number) => number;
    pxToTime: (time: number) => number;
    timeToPx: (px: number) => number;
    timeToPxWithOffset: (time: number) => number;
    pxToTimeWithOffset: (px: number) => number;
    pxToOctave: (px: number) => number;
    octaveToPx: (octave: number) => number;
    pxToOctaveWithOffset: (px: number) => number;
    octaveToPxWithOffset: (octave: number) => number;
    updateSize: (width: number, height: number) => void;
    octaveOffset: number;
    timeOffset: number;
    centerFrequency: number;
    viewWidthPx: number;
    viewHeightPx: number;
    viewWidthTime: number;
    viewHeightOctaves: number;
    scrollBound: number;
    visibleNotes: Array<EditNote>;
}