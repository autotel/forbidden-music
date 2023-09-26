import { throttledWatch } from '@vueuse/core';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Note } from '../dataTypes/Note';
import { setSelection } from '../dataTypes/Selectable';
import { OctaveRange, TimeRange, VelocityRange, } from '../dataTypes/TimelineItem';
import { Trace, TraceType } from '../dataTypes/Trace';
import { getNotesInRange, getTracesInRange } from '../functions/getEventsInRange';
import { useLayerStore } from './layerStore';
import { useProjectStore } from './projectStore';
import { useToolStore } from './toolStore';
import { Tool } from '../dataTypes/Tool';
import { useViewStore } from './viewStore';

export type SelectableRange = TimeRange & (OctaveRange | VelocityRange | {})

export const useSelectStore = defineStore("select", () => {
    const selected = ref(new Set() as Set<Trace>);
    const project = useProjectStore();
    const layers = useLayerStore();
    const tool = useToolStore();
    const view = useViewStore();
    // todo: it's a bit weird that we have this fn but also a selected property on a timelineItem
    const isSelected = (item: Trace) => {
        return selected.value.has(item);
    };
    const refreshTraceSelectionState = () => {
        // TODO: is it really necessary?
        project.score.forEach(n => setSelection(n, isSelected(n)));
        project.loops.forEach(n => setSelection(n, isSelected(n)));
    }
    /**
     * get selected notes
     */
    const getNotes = (): Note[] => {
        return [...selected.value].filter((n) => n.type === TraceType.Note) as Note[];
    };

    const getTraces = () => {
        return [...selected.value];
    }

    const select = (...items: Trace[]) => {
        selected.value.clear();
        selected.value = new Set(items);
        refreshTraceSelectionState();
    };

    const toggle = (...notes: Trace[]) => {
        notes.forEach((n) => {
            if (selected.value.has(n)) {
                selected.value.delete(n);
            } else {
                selected.value.add(n);
            }
        });
        refreshTraceSelectionState();
    };
    const remove = (...project: (Trace)[]) => {
        project.forEach((n) => {
            if (!n) return;
            selected.value.delete(n);
        });
        refreshTraceSelectionState();
    }
    const add = (...trace: (Trace)[]) => {
        trace.forEach((n) => {
            if (!n) return;
            selected.value.add(n);
        });
        refreshTraceSelectionState();
    };
    const getRangeSelectableTraces = (): Trace[] => {
        // if(tool.current === Tool.Edit || tool.current === Tool.Modulation) {
        //     return project.score.filter(({ layer }) => layers.isVisible(layer));
        // } else if(tool.current === Tool.Loop) {
        //     return project.loops;
        // }
        // return [];
        return [...project.score, ...project.loops];
    }
    const selectRange = (range: SelectableRange) => {
        // let notesInRange:Trace[] = getTracesInRange(
        //     getRangeSelectableTraces(),
        //     range
        // );

        // // if in modulation mode, then  also select according to "velolines"
        // if (
        //     // tool.current === Tool.Modulation
        //     'velocity' in range && 'velocityEnd' in range
        // ) {
        //     const notesVeloLinesInRange = getTracesInRange(
        //         project.score, {
        //             time: range.time,
        //             timeEnd: range.timeEnd,
        //         } as SelectableRange
        //     ).filter(event =>
        //         'velocity' in range ? (
        //             event.velocity < range.velocityEnd
        //             &&
        //             event.velocity > range.velocity
        //         ) : false
        //     )
        //     notesInRange.push(...notesVeloLinesInRange)
        // }

        const pxRange = view.pxRangeOf(range);
        const traceRects = [...view.visibleLoopRects, ...view.visibleNoteRects];
        if (!('x' in pxRange && 'y' in pxRange && 'x2' in pxRange && 'y2' in pxRange)) throw new Error('incomplete selection range');
        const sureRange = pxRange as { x: number, y: number, x2: number, y2: number };
        const tracesWithinRange = traceRects.filter(rect => {
            return (
                rect.width + rect.x > sureRange.x &&
                rect.x < sureRange.x2 &&
                rect.height + rect.y > sureRange.y &&
                rect.y < sureRange.y2
            )
        }).map(r=>r.event);

        select(
            ...tracesWithinRange,
        );
    };
    const addRange = (range: SelectableRange) => {
        const newNotes = getTracesInRange(
            project.score,
            range
        );
        add(...newNotes);
    };
    const clear = () => {
        selected.value.clear();
    };
    const selectAll = () => {
        select(...project.score);
    };
    throttledWatch(() => selected.value.size, refreshTraceSelectionState);

    return {
        selectRange,
        selectAll,
        addRange,
        add, select, toggle,
        getTraces,
        getNotes,
        clear: clear, remove,
        isSelected,
        selected,
    };

});
