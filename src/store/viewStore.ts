import { defineStore } from 'pinia'
import { computed, ref, Ref, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { useScoreStore } from './scoreStore.js';
import { useEditNotesStore } from './editNotesStore.js';
import { frequencyToOctave } from '../functions/toneConverters.js';

// TODO: move editNotes to its own library
export const useViewStore = defineStore("view", () => {
    // const view: Ref<View> = ref(new View(1920, 1080, 1024, 3));
    const octaveOffset = ref(1);
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
    const editNotes = useEditNotesStore();
    const score = useScoreStore();

    const visibleNotes = computed((): Array<EditNote> => {
        //TODO: also filter by octave component
        return editNotes.list.filter(editNote => {
            const note = editNote.note;
            return note.start < timeOffset.value + viewWidthTime.value &&
                note.start + (note.duration || 0) > timeOffset.value;
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
    const frequencyToPxWithOffset = (frequency: number): number => {
        return octaveToPxWithOffset(frequencyToOctave(frequency));
    };
    const isOctaveInView = (octave: number): boolean => {
        const ioctave = viewHeightOctaves.value - octave;
        return ioctave >= octaveOffset.value && ioctave <= octaveOffset.value + viewHeightOctaves.value;
    };
    const updateSize = (width: number, height: number) => {
        viewWidthPx.value = width;
        viewHeightPx.value = height;
        _offsetPxX.value = width / 2;
        _offsetPxY.value = height;
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
        frequencyToPxWithOffset,
        
        isOctaveInView,

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
        visibleNotes,
    };
});

export interface View {
    octaveOffset: number;
    timeOffset: number;
    centerFrequency: number;
    viewWidthPx: number;
    viewHeightPx: number;
    viewWidthTime: number;
    viewHeightOctaves: number;
    scrollBound: number;
    pxToBounds(px: number): number;
    timeToBounds(time: number): number;
    boundsToTime(bounds: number): number;
    pxToTime(px: number): number;
    timeToPx(time: number): number;
    timeToPxWithOffset(time: number): number;
    pxToTimeWithOffset(px: number): number;
    pxToOctave(px: number): number;
    octaveToPx(octave: number): number;
    pxToOctaveWithOffset(px: number): number;
    octaveToPxWithOffset(octave: number): number;
}