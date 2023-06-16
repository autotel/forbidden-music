import { defineStore } from "pinia";
import { ref, watch, watchEffect } from "vue";
import { EditNote } from "../dataTypes/EditNote.js";
import { frequencyToOctave } from "../functions/toneConverters.js";
import { useProjectStore } from "./projectStore.js";
import { useToolStore } from "./toolStore.js";

export const useViewStore = defineStore("view", () => {
    // const view: Ref<View> = ref(new View(1920, 1080, 1024, 3));
    const octaveOffset = ref(-3);
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
    const project = useProjectStore();
    const tool = useToolStore();

    watch([
        viewWidthTime, viewHeightOctaves,
        timeOffset, octaveOffset,
    ],() => {
        console.log("visibleNotes");
        project.score.forEach((editNote:EditNote) => {
            editNote.inViewRange = (
                editNote.start < timeOffset.value + viewWidthTime.value &&
                editNote.end > timeOffset.value &&
                editNote.octave > -octaveOffset.value &&
                editNote.octave < -octaveOffset.value + viewHeightOctaves.value
            );
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
        return (time * viewWidthTime.value) / viewWidthPx.value;
    };
    const timeToPx = (time: number): number => {
        if (time === Infinity) return viewWidthPx.value + 2;
        if (time === -Infinity) return -viewWidthPx.value - 2;
        return (time * viewWidthPx.value) / viewWidthTime.value;
    };
    const timeToPxWithOffset = (time: number): number => {
        if (time === Infinity) return viewWidthPx.value + 2;
        if (time === -Infinity) return -viewWidthPx.value - 2;
        return timeToPx(time - timeOffset.value);
    };
    const pxToTimeWithOffset = (px: number): number => {
        return pxToTime(px) + timeOffset.value;
    };
    const pxToOctave = (px: number): number => {
        return (px * -viewHeightOctaves.value) / viewHeightPx.value;
    };
    const octaveToPx = (octave: number): number => {
        if (octave === Infinity) return viewHeightPx.value + 2;
        if (octave === -Infinity) return -viewHeightPx.value - 2;
        return (octave * viewHeightPx.value) / -viewHeightOctaves.value;
    };
    const pxToOctaveWithOffset = (px: number): number => {
        return pxToOctave(px - _offsetPxY.value) - octaveOffset.value;
    };
    const octaveToPxWithOffset = (octave: number): number => {
        if (octave === Infinity) return viewHeightPx.value + 2;
        if (octave === -Infinity) return -viewHeightPx.value - 2;
        return octaveToPx(octave + octaveOffset.value) + _offsetPxY.value;
    };
    const frequencyToPxWithOffset = (frequency: number): number => {
        if (frequency === Infinity) return viewHeightPx.value + 2;
        if (frequency === -Infinity) return -viewHeightPx.value - 2;
        return octaveToPxWithOffset(frequencyToOctave(frequency));
    };
    const isOctaveInView = (octave: number): boolean => {
        const ioctave = viewHeightOctaves.value - octave;
        return (
            ioctave >= octaveOffset.value &&
            ioctave <= octaveOffset.value + viewHeightOctaves.value
        );
    };
    const veloPXK = 4;
    const velocityToPx = (velocity: number): number => {
        return (velocity * viewHeightPx.value) / veloPXK;
    };
    const pxToVelocity = (px: number): number => {
        return (px * veloPXK) / viewHeightPx.value;
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
        velocityToPx,
        pxToVelocity,
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
    };
});

export type View = ReturnType<typeof useViewStore>;
