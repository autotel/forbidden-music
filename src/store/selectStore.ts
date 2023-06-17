import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { useProjectStore } from './projectStore';
import { throttledWatch } from '@vueuse/core';
import { Group } from '../dataTypes/Group';

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
        const timeInRange = editNote.end >= timeStart && editNote.start <= timeEnd;
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
        const octaveBound = group.bounds[1].sort();
        const octaveInRange = octaveBound[0] >= octaveStart && octaveBound[1] <= octaveEnd;
        const timeInRange = group.bounds[0][0] >= timeStart && group.bounds[0][1] <= timeEnd;
        return octaveInRange && timeInRange;
    });
};



export const useSelectStore = defineStore("select", () => {
    const selectedNotes = ref(new Set() as Set<EditNote>);
    const project = useProjectStore();
    const isEditNoteSelected = (editNote: EditNote) => {
        return selectedNotes.value.has(editNote);
    };
    const refreshNoteSelectionState = () => {
        project.score.forEach(n => n.selected = isEditNoteSelected(n))
    }
    const get = () => {
        return [...selectedNotes.value];
    };
    const select = (...notes: EditNote[]) => {
        selectedNotes.value.clear();
        selectedNotes.value = new Set(notes);
    };
    const toggle = (...notes: EditNote[]) => {
        notes.forEach((n) => {
            if (selectedNotes.value.has(n)) {
                selectedNotes.value.delete(n);
            } else {
                selectedNotes.value.add(n);
            }
        });
    };
    const remove = (...project: (EditNote)[]) => {
        project.forEach((n) => {
            if (!n) return;
            selectedNotes.value.delete(n);
        });
        refreshNoteSelectionState();
    }
    const add = (...editNote: (EditNote)[]) => {
        editNote.forEach((n) => {
            if (!n) return;
            selectedNotes.value.add(n);
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
        selectedNotes.value.clear();
    };
    const selectAll = () => {
        select(...project.score);
    };
    throttledWatch(() => selectedNotes.value.size, refreshNoteSelectionState);

    return {
        selectRange,
        selectAll,
        addRange,
        add, select, toggle, get,
        clear: clear, remove,
        isEditNoteSelected,
        selectedNotes,
    };

});
