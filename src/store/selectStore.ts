import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { useProjectStore } from './projectStore';
import { throttledWatch } from '@vueuse/core';
import { Group } from '../dataTypes/Group';
import { TimelineItem } from '../dataTypes/TimelineItem';



const getNotesInRange = (
    notes: EditNote[],
    range: {
        startTime: number,
        endTime: number,
        startOctave: number,
        endOctave: number
    }
) => {
    const octaveStart = Math.min(range.startOctave, range.endOctave);
    const octaveEnd = Math.max(range.startOctave, range.endOctave);
    const timeStart = Math.min(range.startTime, range.endTime);
    const timeEnd = Math.max(range.startTime, range.endTime);

    return notes.filter((editNote) => {
        const octaveInRange = editNote.octave >= octaveStart && editNote.octave <= octaveEnd;
        const timeInRange = editNote.timeEnd >= timeStart && editNote.time <= timeEnd;
        return octaveInRange && timeInRange;
    });
};

const getGroupsInRange = (
    groups: Group[],
    range: {
        startTime: number,
        endTime: number,
        startOctave: number,
        endOctave: number
    }
) => {
    const octaveStart = Math.min(range.startOctave, range.endOctave);
    const octaveEnd = Math.max(range.startOctave, range.endOctave);
    const timeStart = Math.min(range.startTime, range.endTime);
    const timeEnd = Math.max(range.startTime, range.endTime);

    return groups.filter((group) => {
        const octaveBound = [group.octave, group.octaveEnd];
        const octaveInRange = octaveBound[0] >= octaveStart && octaveBound[1] <= octaveEnd;
        const timeInRange = group.time >= timeStart && group.timeEnd <= timeEnd;
        return octaveInRange && timeInRange;
    });
};


export const useSelectStore = defineStore("select", () => {
    const selected = ref(new Set() as Set<TimelineItem>);

    const project = useProjectStore();
    
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

    const getNotes = ():EditNote[] => {
        return [...selected.value].filter((n) => n instanceof EditNote) as EditNote[];
    };
    const getGroups = ():Group[] => {
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
    const selectRange = (range: {
        startTime: number,
        endTime: number,
        startOctave: number,
        endOctave: number
    }, restrictToGroup: (Group | null | false) = false) => {
        let notesInRange = getNotesInRange(
            project.score,
            range
        )
        
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
    const addRange = (range: {
        startTime: number,
        endTime: number,
        startOctave: number,
        endOctave: number
    }) => {
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
