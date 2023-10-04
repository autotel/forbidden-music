import { defineStore } from "pinia";
import { computed, ref, watchEffect } from "vue";
import { Loop } from "../dataTypes/Loop.js";
import { Note, getDuration } from "../dataTypes/Note.js";
import { TimeRange, sanitizeTimeRanges } from "../dataTypes/TimelineItem.js";
import { Trace } from "../dataTypes/Trace.js";
import { getNotesInRange, getTracesInRange } from "../functions/getEventsInRange.js";
import { frequencyToOctave } from "../functions/toneConverters.js";
import { useLayerStore } from "./layerStore.js";
import { usePlaybackStore } from "./playbackStore.js";
import { useProjectStore } from "./projectStore.js";
import { useToolStore } from "./toolStore.js";
import { Tool } from "../dataTypes/Tool.js";
const rgbToHex = (r: number, g: number, b: number) => {
    r = r & 0xff;
    g = g & 0xff;
    b = b & 0xff;
    return ((r << 16) | (g << 8) | b);
};

const averageColors = (...colors: number[]) => {
    let r = 0;
    let g = 0;
    let b = 0;
    colors.forEach((c) => {
        r += (c >> 16) & 0xff;
        g += (c >> 8) & 0xff;
        b += c & 0xff;
    });
    r = Math.round(r / colors.length);
    g = Math.round(g / colors.length);
    b = Math.round(b / colors.length);
    return rgbToHex(r, g, b);
};

const desaturate = (color: number, amount: number) => {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    const avg = (r + g + b) / 3;
    const dr = r - avg;
    const dg = g - avg;
    const db = b - avg;

    const newR = Math.round(avg + dr * amount);
    const newG = Math.round(avg + dg * amount);
    const newB = Math.round(avg + db * amount);

    return rgbToHex(newR, newG, newB);
};

const gray = rgbToHex(200, 200, 200);

const numberOr = (v: any, or: number): number => {
    if (typeof v === 'number') return v;
    return or;
}

const preparation = (r: number, g: number, b: number) => desaturate(averageColors(rgbToHex(r, g, b), 0xFFFFFF), 0.6);

export const layerNoteColors = [
    gray,
    preparation(84, 125, 251),
    preparation(217, 59, 59),
    preparation(240, 197, 28),
    preparation(247, 119, 227),
    preparation(38, 107, 134),
    preparation(173, 215, 80),
    preparation(183, 96, 255),
    preparation(82, 148, 187),
    preparation(227, 38, 163),
    preparation(223, 141, 100),
];

export const layerNoteColorStrings = layerNoteColors.map(c => `#${c.toString(16).padStart(6, '0')}`);
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

export interface TimelineItemRect<T extends Trace = Trace> {
    event: T;

    // key: number;

    x: number;
    y: number;
    width: number;
    height: number;

    radius?: number;
    cx?: number;
    cy?: number;

    rightEdge?: {
        x: number;
        y: number;
    };
}
export interface NoteRect extends TimelineItemRect {
    event: Note;
    cx: number;
    cy: number;
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
    const viewWidthPx = ref(800);
    const viewHeightPx = ref(800);
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
    const memoizedNoteRects: NoteRect[] = [];
    const layers = useLayerStore();
    const tool = useToolStore();

    // TODO: maybe doesn't need to be a computed, 
    // we don't need to recalc every note when one note is dragged
    // for example. Especially since the new canvas frame 
    // is going to ask for the coords anyways. 
    // they could be calculated only when asked, memoized too.
    const visibleNotes = computed((): Note[] => {
        visibleNotesRefreshKey.value;
        const layerVisibleNotes = project.score.filter(({ layer }) => layers.isVisible(layer));
        return getNotesInRange(layerVisibleNotes, {
            time: timeOffset.value,
            timeEnd: timeOffset.value + viewWidthTime.value,
            octave: -octaveOffset.value,
            octaveEnd: -octaveOffset.value + viewHeightOctaves.value,
        });
    });

    const visibleLoops = computed((): Loop[] => {
        visibleNotesRefreshKey.value;
        const items = [...project.loops] as Loop[];

        return items.filter((item) => {
            return item.timeEnd >= timeOffset.value && item.time <= timeOffset.value + viewWidthTime.value;
        });

    });

    const visibleNoteRects = computed((): NoteRect[] => {
        memoizedNoteRects.length = 0;
        return visibleNotes.value.map((note) => {
            let r = rectOfNote(note);
            memoizedNoteRects.push(r);
            return r;
        })
    });

    const visibleLoopRects = computed((): TimelineItemRect<Loop>[] => {
        return visibleLoops.value.map((item) => {
            let r = rectOfLoop(item) as TimelineItemRect<Loop>;
            return r;
        })
    });

    // todo: un-hardcode this everywhere
    const rightEdgeWidth = 10;

    const rectOfNote = (note: Note): NoteRect => {
        const duration = getDuration(note);
        let rect = {
            x: timeToPxWithOffset(note.time) || 0,
            y: octaveToPxWithOffset(note.octave) || 0,
            width: timeToPx(duration) || 0,
            height: Math.abs(octaveToPx(1 / 12)) || 0,
            radius: 0,
            event: note,
            // key: tkey++,
        } as NoteRect

        rect.radius = rect.height / 2;
        rect.cx = rect.x;
        rect.cy = rect.y;
        rect.y -= rect.radius;

        if (duration) {
            rect.rightEdge = {
                x: rect.x + rect.width - rightEdgeWidth,
                y: rect.y,
            };
        }
        return rect;
    };

    const rectOfLoop = (item: TimeRange): TimelineItemRect<Loop> => {
        let itemDuration = item.timeEnd - item.time;
        const isFullHeight = tool.current === Tool.Loop;

        let rect = {
            x: timeToPxWithOffset(item.time),
            y: 40,
            width: timeToPx(itemDuration),
            height: isFullHeight?viewHeightPx.value: 40,
            event: item,

        } as TimelineItemRect<Loop>;

        rect.rightEdge = {
            x: rect.x + rect.width - rightEdgeWidth,
            y: rect.y,
        };

        return rect;
    }

    const locationOfTrace = (trace: Trace): { trace: Trace, x: number, y: number } => {
        return {
            trace: trace,
            x: timeToPxWithOffset(trace.time),
            y: 'octave' in trace ? octaveToPxWithOffset(trace.octave) : 0,
        }
    }


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

    const rangeToStrictRect = (range: {
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

    const everyNoteAtCoordinates = (x: number, y: number, considerVeloLines: boolean): NoteRect[] => {
        const noteRects = visibleNoteRects.value;
        const items = noteRects.filter((noteRect) => {
            const veloPy = considerVeloLines ? velocityToPxWithOffset(noteRect.event.velocity) : 0;
            const isThin = noteRect.width === 0;

            if (!noteRect.radius) throw new Error("no radius");

            if (isThin && (
                x >= noteRect.x - noteRect.radius &&
                x <= noteRect.x + noteRect.radius &&
                // note theh/v asymmetry
                y >= noteRect.y &&
                y <= noteRect.y + noteRect.height
            )) {
                return true;
            } else

                if (
                    (
                        x >= noteRect.x &&
                        x <= noteRect.x + noteRect.width &&
                        y >= noteRect.y &&
                        y <= noteRect.y + noteRect.height
                    ) || (
                        considerVeloLines &&
                        noteRect.x - 7 <= x &&
                        noteRect.x + 7 >= x &&
                        veloPy - 7 <= y &&
                        veloPy + 7 >= y
                    )
                ) {
                    return true;
                }
            return false;
        });
        return items;
    };

    const everyLoopAtCoordinates = (x: number, y: number): TimelineItemRect[] => {
        let itemRects = visibleLoopRects.value;
        itemRects = itemRects.filter((itemRect) => {
            if (
                x >= itemRect.x &&
                x <= itemRect.x + itemRect.width &&
                y >= itemRect.y &&
                y <= itemRect.y + itemRect.height
            ) {
                return true;
            }
            return false;
        });
        return itemRects;
    }

    const forceRefreshVisibleNotes = () => {
        visibleNotesRefreshKey.value++;
        memoizedNoteRects.length = 0;
    };

    const setTimeOffset = (newTimeOffset: number) => {
        timeOffset.value = newTimeOffset;
    };
    const setTimeOffsetBounds = (timeOffsetBounded: number) => {
        timeOffset.value = boundsToTime(timeOffsetBounded);
    };
    const pxToBounds = (px: number): number => {
        // h/v constrained
        // return px / viewHeightPx.value;
        // view proportion dependent
        return px / viewWidthPx.value;
    };
    const timeToBounds = (time: number): number => {
        if (scrollBound.value === 0) return 0;
        return time / scrollBound.value;
    };
    const boundsToTime = (bounds: number): number => {
        return bounds * scrollBound.value;
    };
    const pxToTime = (time: number): number => {
        if (viewWidthPx.value === 0) return 0;
        return (time * viewWidthTime.value) / viewWidthPx.value;
    };
    const timeToPx = (px: number): number => {
        if (viewWidthTime.value === 0) return 0;
        return (px * viewWidthPx.value) / viewWidthTime.value;
    };
    const timeToPxWithOffset = (time: number): number => {
        return timeToPx(time - timeOffset.value);
    };
    const pxToTimeWithOffset = (px: number): number => {
        return pxToTime(px) + timeOffset.value;
    };
    const pxToOctave = (px: number): number => {
        if (viewHeightPx.value === 0) return 0;
        return (px * -viewHeightOctaves.value) / viewHeightPx.value;
    };
    const octaveToPx = (octave: number): number => {
        if (viewHeightOctaves.value === 0) return 0;
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
        // if(veloPXK === 0) return 0;
        return (velocity * viewHeightPx.value) / veloPXK;
    };
    const pxToVelocity = (px: number): number => {
        if (viewHeightPx.value === 0) return 0;
        return (px * veloPXK) / viewHeightPx.value;
    };
    const velocityToPxWithOffset = (velocity: number): number => {
        return viewHeightPx.value - velocityToPx(velocity);
    };
    const pxToVelocityWithOffset = (px: number): number => {
        return pxToVelocity(viewHeightPx.value - px);
    };

    let ratio = 1;
    const applyRatioToTime = () => {
        if (viewWidthPx.value === 0) return 0;
        const viewPxRatio = viewWidthPx.value / viewHeightPx.value;
        viewWidthTime.value = viewHeightOctaves.value * (ratio * viewPxRatio);
    }

    const updateSize = (width: number, height: number) => {
        viewWidthPx.value = width;
        viewHeightPx.value = height;
        _offsetPxX.value = width / 2;
        _offsetPxY.value = height;
        applyRatioToTime();
    };


    const setOctaveToTimeRatio = (newRatio: number) => {
        ratio = newRatio;
        applyRatioToTime();
    }

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
        rangeToStrictRect,
        rectOfNote,
        rectOfLoop,
        locationOfTrace,

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
        visibleLoopRects,

        everyNoteAtCoordinates,
        everyLoopAtCoordinates,
        followPlayback,
        rightEdgeWidth,

        applyRatioToTime,
        setOctaveToTimeRatio,
    };
});

export type View = ReturnType<typeof useViewStore>;
