import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { useProjectStore } from './projectStore';
import { throttledWatch } from '@vueuse/core';

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
        const timeInRange = editNote.start >= timeStart && editNote.start <= timeEnd;
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
    const select = (...project: EditNote[]) => {
        selectedNotes.value.clear();
        selectedNotes.value = new Set(project);
    };
    const toggle = (...project: EditNote[]) => {
        project.forEach((n) => {
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
    }) => {
        select(...getNotesInRange(
            project.score,
            range
        ));
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
    throttledWatch(selectedNotes, refreshNoteSelectionState);

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
