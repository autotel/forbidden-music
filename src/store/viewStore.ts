import { defineStore } from "pinia";
import { computed, ref, watch, watchEffect } from "vue";
import { EditNote } from "../dataTypes/EditNote.js";
import { getNotesInRange } from "../functions/getNotesInRange.js";
import { frequencyToOctave } from "../functions/toneConverters.js";
import { usePlaybackStore } from "./playbackStore.js";
import { useProjectStore } from "./projectStore.js";

// const measureCallTime = (name:string, fn:Function)=>{
//     const wrappedFn = (...p:any[])=>{
//         const start = performance.now();
//         const result = fn(...p);
//         const end = performance.now();
//         console.log("call time", name, end-start);
//         return result;
//     }
//     return wrappedFn;
// }

// Function.prototype.measureTime = function (name:string) {
//     return measureCallTime(this.name, this);
// }


export interface NoteRect {
    event: EditNote;

    // key: number;

    x: number;
    y: number;
    width: number;
    height: number;

    radius: number;
    cx: number;
    cy: number;

    rightEdge?: {
        x: number;
        y: number;
    };
}

const probe = (v: any) => {
    console.log(v);
    return v;
}


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
    const followPlayback = ref(false);
    const playback = usePlaybackStore();
    const visibleNotesRefreshKey = ref(0);

    const memoizedRects: NoteRect[] = [];
    // TODO: maybe doesn't need to be a computed, 
    // we don't need to recalc every note when one note is dragged
    // for example. Especially since the new canvas frame 
    // is going to ask for the coords anyways. 
    // they could be calculated only when asked, memoized too.
    const visibleNotes = computed((): EditNote[] => {
        visibleNotesRefreshKey.value;
        return getNotesInRange(project.score, {
            time: timeOffset.value,
            timeEnd: timeOffset.value + viewWidthTime.value,
            octave: -octaveOffset.value,
            octaveEnd: -octaveOffset.value + viewHeightOctaves.value,
        });
    });
    // TODO: Same here.
    const visibleNoteRects = computed((): NoteRect[] => {
        memoizedRects.length = 0;
        return visibleNotes.value.map((note) => {
            let r = rectOfNote(note);
            memoizedRects.push(r);
            return r;
        });
    });

    // watch(visibleNotes,() => {
    //     console.log("visibleNotes mutated",visibleNotes);
    // })
    // watch(visibleNoteRects,() => {
    //     console.log("visibleNoteRects mutated",visibleNoteRects);
    // })

    const rectOfNote = (note: EditNote): NoteRect => {
        let rect = {
            x: timeToPxWithOffset(note.time) || 0,
            y: octaveToPxWithOffset(note.octave) || 0,
            width: timeToPx(note.duration) || 0,
            height: Math.abs(octaveToPx(1 / 12)) || 0,
            radius: 0,
            event: note,
            // key: tkey++,
        } as NoteRect

        rect.radius = rect.height / 2;
        rect.cx = rect.x;
        rect.cy = rect.y;
        rect.y -= rect.radius;

        if (note.duration) {
            if (!note.timeEnd) console.warn("note has duration but no timeEnd", note)
            rect.rightEdge = {
                x: rect.x + rect.width,
                y: rect.y,
            };
        }
        return rect;
    };

    const castIfDefined = (castFn = (v: number) => v, v: number | undefined, otherwise: null | number = null) => {
        return v === undefined ? otherwise : castFn(v);
    }
    const deleteNullVals = (obj: any) => {
        Object.keys(obj).forEach(key => obj[key] === null && delete obj[key]);
        return obj;
    }
    const nOrNullSort = (a: number | null, b: number | null) => {
        if (a === null) return 1;
        if (b === null) return -1;
        return a - b;
    }
    const pxRangeOf = (range: {
        time?: number,
        octave?: number,
        timeEnd?: number,
        octaveEnd?: number,
    }): { x?: number, y?: number, x2?: number, y2?: number } => {
        const xf = [castIfDefined(timeToPxWithOffset, range.time), castIfDefined(timeToPxWithOffset, range.timeEnd)].sort(nOrNullSort);
        const yf = [castIfDefined(octaveToPxWithOffset, range.octave), castIfDefined(octaveToPxWithOffset, range.octaveEnd)].sort(nOrNullSort);
        return deleteNullVals({
            x: xf[0],
            y: yf[0],
            x2: xf[1],
            y2: yf[1],
        })
    }

    const pxRectOf = (range: {
        time?: number,
        octave?: number,
        timeEnd?: number,
        octaveEnd?: number,
    }): { x: number, y: number, width: number, height: number } => {
        const pxRange = pxRangeOf(range);
        const x = pxRange.x || 0;
        const y = pxRange.y || 0;
        return {
            x,
            y,
            width: (pxRange.x2 || 0) - x,
            height: (pxRange.y2 || 0) - y,
        }
    }

    const everyNoteRectAtCoordinates = (x: number, y: number, considerVeloLines: boolean): NoteRect[] => {
        const items: NoteRect[] = [];
        const noteRects = visibleNoteRects.value;
        for (let i = 0; i < noteRects.length; i++) {
            const noteRect = noteRects[i];
            const effxWidth = noteRect.width || noteRect.radius * 2;
            const veloPy = considerVeloLines ? velocityToPxWithOffset(noteRect.event.velocity) : 0;
            if (
                (
                    noteRect.x <= x &&
                    noteRect.x + effxWidth >= x &&
                    noteRect.y <= y &&
                    noteRect.y + noteRect.height >= y
                ) || (
                    considerVeloLines &&
                    noteRect.x - 7 <= x &&
                    noteRect.x + 7 >= x &&
                    veloPy - 7 <= y &&
                    veloPy + 7 >= y
                )

            ) {
                items.push(noteRect);
            }
        }
        return items;
    };

    const forceRefreshVisibleNotes = () => {
        visibleNotesRefreshKey.value++;
        memoizedRects.length = 0;
    };

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
    const timeToPx = (px: number): number => {
        return (px * viewWidthPx.value) / viewWidthTime.value;
    };
    const timeToPxWithOffset = (time: number): number => {
        return timeToPx(time - timeOffset.value);
    };
    const pxToTimeWithOffset = (px: number): number => {
        return pxToTime(px) + timeOffset.value;
    };
    const pxToOctave = (px: number): number => {
        return (px * -viewHeightOctaves.value) / viewHeightPx.value;
    };
    const octaveToPx = (octave: number): number => {
        return (octave * viewHeightPx.value) / -viewHeightOctaves.value;
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
    const velocityToPxWithOffset = (velocity: number): number => {
        return viewHeightPx.value - velocityToPx(velocity);
    };
    const pxToVelocityWithOffset = (px: number): number => {
        return pxToVelocity(viewHeightPx.value - px);
    };

    const updateSize = (width: number, height: number) => {
        viewWidthPx.value = width;
        viewHeightPx.value = height;
        _offsetPxX.value = width / 2;
        _offsetPxY.value = height;
    };

    watchEffect(() => {
        if (followPlayback.value) {
            setTimeOffset(
                Math.max(0, playback.currentScoreTime - viewWidthTime.value / 2)
            )
        }
    })

    return {
        setTimeOffset,
        setTimeOffsetBounds,

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
        velocityToPxWithOffset,
        pxToVelocityWithOffset,

        pxToBounds,
        boundsToTime,
        timeToBounds,

        pxRangeOf,
        pxRectOf,
        rectOfNote,

        isOctaveInView,

        updateSize,
        forceRefreshVisibleNotes,

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

        visibleNoteRects,
        everyNoteRectAtCoordinates,

        followPlayback,
    };
});

export type View = ReturnType<typeof useViewStore>;
