import { throttledWatch } from '@vueuse/core';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { TimeRange, TimeRangeOctaveRange, TimeRangeOctaveRangeVelocityRange, TimeRangeVelocityRange, TimelineSelectableItem } from '../dataTypes/TimelineItem';
import { getNotesInRange } from '../functions/getNotesInRange';
import { useProjectStore } from './projectStore';
import { useToolStore } from './toolStore';
import { useViewStore } from './viewStore';
import { useLayerStore } from './layerStore';


export type SelectableRange = TimeRange | TimeRangeOctaveRange | TimeRangeVelocityRange | TimeRangeOctaveRangeVelocityRange;


export const useSelectStore = defineStore("select", () => {
    const selected = ref(new Set() as Set<TimelineSelectableItem>);
    const tool = useToolStore();
    const project = useProjectStore();
    const view = useViewStore();
    const layers = useLayerStore();

    // todo: it's a bit weird that we have this fn but also a selected property on a timelineItem
    const isSelected = (item: TimelineSelectableItem) => {
        return selected.value.has(item);
    };
    const refreshNoteSelectionState = () => {
        project.score.forEach(n => n.selected = isSelected(n))
    }
    /**
     * get selected notes
     */
    const getNotes = (): EditNote[] => {
        return [...selected.value].filter((n) => n instanceof EditNote) as EditNote[];
    };

    const select = (...items: TimelineSelectableItem[]) => {
        selected.value.clear();
        selected.value = new Set(items);
        refreshNoteSelectionState();
    };

    const toggle = (...notes: EditNote[]) => {
        notes.forEach((n) => {
            if (selected.value.has(n)) {
                selected.value.delete(n);
            } else {
                selected.value.add(n);
            }
        });
        refreshNoteSelectionState();
    };
    const remove = (...project: (EditNote)[]) => {
        project.forEach((n) => {
            if (!n) return;
            selected.value.delete(n);
        });
        refreshNoteSelectionState();
    }
    const add = (...editNote: (EditNote)[]) => {
        editNote.forEach((n) => {
            if (!n) return;
            selected.value.add(n);
        });
        refreshNoteSelectionState();
    };
    const selectRange = (range: SelectableRange) => {
        const visibleLayersNotes = project.score.filter(({layer}) => layers.isVisible(layer))
        let notesInRange = getNotesInRange(
            visibleLayersNotes,
            range
        );

        // if in modulation mode, then  also select according to "velolines"
        if (
            // tool.current === Tool.Modulation
            'velocity' in range && 'velocityEnd' in range
        ) {
            const notesVeloLinesInRange = getNotesInRange(
                project.score, {
                    time: range.time,
                    timeEnd: range.timeEnd,
                } as SelectableRange
            ).filter(event =>
                'velocity' in range ? (
                    event.velocity < range.velocityEnd
                    &&
                    event.velocity > range.velocity
                ) : false
            )
            notesInRange.push(...notesVeloLinesInRange)
        }

        select(
            ...notesInRange,
        );
    };
    const addRange = (range: SelectableRange) => {
        const newNotes = getNotesInRange(
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
    throttledWatch(() => selected.value.size, refreshNoteSelectionState);

    return {
        selectRange,
        selectAll,
        addRange,
        add, select, toggle,
        getNotes, 
        clear: clear, remove,
        isSelected,
        selected,
    };

});
