import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { useProjectStore } from './projectStore';
import { throttledWatch } from '@vueuse/core';
import { Group } from '../dataTypes/Group';
import { TimelineItem } from '../dataTypes/TimelineItem';
import { useToolStore } from './toolStore';
import { Tool } from '../dataTypes/Tool';
import { useViewStore } from './viewStore';

export interface TimeRange {
    time: number,
    timeEnd: number,
}

export interface OctaveRange {
    octave: number,
    octaveEnd: number,
}

export interface VelocityRange {
    velocity: number,
    velocityEnd: number,
}

export interface RangeA extends TimeRange, OctaveRange {}
export interface RangeC extends TimeRange, VelocityRange {}
export interface RangeD extends TimeRange, OctaveRange, VelocityRange {}


export type SelectableRange = TimeRange | RangeA | RangeC | RangeD;


const getGroupsInRange = (
    groups: Group[],
    range: {
        startTime: number,
        timeEnd: number,
        octave: number,
        octaveEnd: number
    }
) => {
    // range is expected to come in positive ranges
    const timeStart = range.startTime;
    const timeEnd = range.timeEnd;
    const octaveStart = range.octave;
    const octaveEnd = range.octaveEnd;

    return groups.filter((group) => {
        const octaveBound = [group.octave, group.octaveEnd];
        const octaveInRange = octaveBound[0] >= octaveStart && octaveBound[1] <= octaveEnd;
        const timeInRange = group.time >= timeStart && group.timeEnd <= timeEnd;
        return octaveInRange && timeInRange;
    });
};


export const useSelectStore = defineStore("select", () => {
    const selected = ref(new Set() as Set<TimelineItem>);
    const tool = useToolStore();
    const project = useProjectStore();
    const view = useViewStore();

    // todo: it's a bit weird that we have this fn but also a selected property on a timelineItem
    const isSelected = (item: TimelineItem) => {
        return selected.value.has(item);
    };
    const refreshNoteSelectionState = () => {
        project.score.forEach(n => n.selected = isSelected(n))
    }
    const refreshGroupSelectionState = () => {
        project.groups.forEach(g => g.selected = isSelected(g))
    }

    const getNotes = (): EditNote[] => {
        return [...selected.value].filter((n) => n instanceof EditNote) as EditNote[];
    };
    const getGroups = (): Group[] => {
        return [...selected.value].filter((n) => n instanceof Group) as Group[];
    };

    const select = (...items: TimelineItem[]) => {
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
    const selectRange = (range: SelectableRange, restrictToGroup: (Group | null | false) = false) => {

        let notesInRange = getNotesInRange(
            project.score,
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

        if (restrictToGroup !== false) { // note that null is also a valid group restriction
            notesInRange = notesInRange.filter(n => n.group === restrictToGroup)
        }

        // let groupsInRange:Group[] = [];
        // if (!restrictToGroup) { // null or false
        //     const groupsInRange = getGroupsInRange(
        //         project.groups,
        //         range
        //     )
        // }


        select(
            ...notesInRange,
            // ...groupsInRange
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
        getNotes, getGroups,
        clear: clear, remove,
        isSelected,
        selected,
    };

});
