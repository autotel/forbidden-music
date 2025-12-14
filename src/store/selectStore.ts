import { throttledWatch } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { Note } from '../dataTypes/Note';
import { setSelection } from '../dataTypes/Selectable';
import { OctaveRange, TimeRange, VelocityRange, } from '../dataTypes/TimelineItem';
import { Tool } from '../dataTypes/Tool';
import { Trace, TraceType } from '../dataTypes/Trace';
import { filterMap } from "../functions/filterMap";
import { getTracesInRange, getTracesStartingInRange } from '../functions/getEventsInRange';
import { useAutomationLaneStore } from './automationLanesStore';
import { useLayerStore } from './layerStore';
import { useProjectStore } from './projectStore';
import { useToolStore } from './toolStore';
import { useViewStore } from './viewStore';
import { Loop } from '@/dataTypes/Loop';
import { useLoopsStore } from './loopsStore';
import { useNotesStore } from './notesStore';
export type SelectableRange = TimeRange & (OctaveRange | VelocityRange | {})

export const useSelectStore = defineStore("select", () => {
    const selected = ref(new Set() as Set<Trace>);
    const project = useProjectStore();
    const layers = useLayerStore();
    const loops = useLoopsStore();
    const tool = useToolStore();
    const notes = useNotesStore();
    const view = useViewStore();
    const lanes = useAutomationLaneStore();
    // todo: it's a bit weird that we have this fn but also a selected property on a timelineItem
    const isSelected = (item: Trace) => {
        return selected.value.has(item);
    };
    const refreshTraceSelectionState = () => {
        notes.list.forEach(n => setSelection(n, isSelected(n)));
        loops.list.forEach(n => setSelection(n, isSelected(n)));
        lanes.forEachAutomationPoint(n => setSelection(n, isSelected(n)));
    }
    const length = computed(() => selected.value.size);
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
    
    const selectRange = (
        range: SelectableRange,
        selectNotes = true,
        selectAutomationPoints = true,
        selectLoops = true,
        additive = false,
    ) => {
        if(!additive) select();

        const pxRange = view.pxRangeOf(range);

        const traceRects = [];
        
        if(selectNotes) traceRects.push(...view.visibleNoteDrawables);
        if(selectAutomationPoints) traceRects.push(...view.visibleAutomationPointDrawables);
        if(selectLoops) traceRects.push(...view.visibleLoopDrawables);
        if(!traceRects.length) return;

        if (!('x' in pxRange && 'y' in pxRange && 'x2' in pxRange && 'y2' in pxRange)) throw new Error('incomplete selection range');
        const sureRange = pxRange as { x: number, y: number, x2: number, y2: number };

        const tracesWithinTimeRange = traceRects.filter(rect => {
            const width = 'width' in rect ? rect.width : 0;
            return (
                width + rect.x > sureRange.x &&
                rect.x < sureRange.x2
            )
        });

        const tracesWithinRange = tracesWithinTimeRange.filter(rect => {
            const width = 'width' in rect ? rect.width : 0;
            const height = 'height' in rect ? rect.height : 0;
            return (
                width + rect.x > sureRange.x &&
                rect.x < sureRange.x2 &&
                height + rect.y > sureRange.y &&
                rect.y < sureRange.y2
            )
        }).map(r => r.event);

        if (
            'velocity' in range && 'velocityEnd' in range
        ) {
            const tracesWithingVeloRange = filterMap(tracesWithinTimeRange, rect => {
                const evt = rect.event;
                if (evt.type !== TraceType.Note) return false;
                const note = evt as Note;
                return (
                    // bc. velolines appear at start of notes
                    note.time >= range.time &&
                    note.time <= range.timeEnd &&
                    note.velocity >= range.velocity &&
                    note.velocity <= range.velocityEnd
                ) ? note : false;
            })
            add(
                ...tracesWithingVeloRange,
            );
        }


        add(
            ...tracesWithinRange,
        );
    };
    const addRange = (range: SelectableRange) => {
        const newNotes = getTracesInRange(
            notes.list,
            range
        );
        add(...newNotes);
    };
    const clear = () => {
        selected.value.clear();
    };
    const selectAll = () => {
        const whatToSelect:Trace[] = []
        switch (tool.current) {
            case Tool.Loop:
                whatToSelect.push(...loops.list)
                break;
            case Tool.Automation:{
                const currentLane = tool.laneBeingEdited
                if(currentLane) whatToSelect.push(...currentLane.content)
                break;
            }
            default: {
                const visibleLayerNotes = notes.list.filter(n => layers.isVisible(n.layer))
                whatToSelect.push(...visibleLayerNotes)
            }
        }
        
        select(...whatToSelect);
    };

    const selectLoopAndNotes = (loop: Loop) => {
        const startingInRange = getTracesStartingInRange([
            ...notes.list,
            ...loops.list,
        ], {
            time: loop.time,
            timeEnd: loop.timeEnd
        });
        select(...startingInRange)
    }

    throttledWatch(() => selected.value.size, refreshTraceSelectionState);

    return {
        selectRange,
        selectAll,
        selectLoopAndNotes,
        addRange,
        add, select, toggle,
        getTraces,
        getNotes,
        clear: clear, remove,
        isSelected,
        selected,
        length,
        deleteSelected() {

            notes.set(notes.list.filter(note => !note.selected))
            // TODO: Should I create a function within the store, do we loose necessary references elsewhere?
            loops.set(loops.list.filter(note => !note.selected))
            project.lanes.lanes.forEach((lane) => lane.content = lane.content.filter(p => !p.selected))
            
            tool.resetState();
            clear();
        }
    };

});
