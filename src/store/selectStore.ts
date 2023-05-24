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
    
    return notes.filter(({ note }) => {
        const octaveInRange = note.octave >= octaveStart && note.octave <= octaveEnd;
        const timeInRange = note.start >= timeStart && note.start <= timeEnd;
        return octaveInRange && timeInRange;
    });
};



export const useSelectStore = defineStore("select", () => {
    const selectedNotes = ref(new Set() as Set<EditNote>);
    const editNotes = useProjectStore();
    const isEditNoteSelected = (note: EditNote) => {
        return selectedNotes.value.has(note);
    };
    const refreshNoteSelectionState = () => {
        editNotes.list.forEach(n => n.selected = isEditNoteSelected(n))
    }
    const get = () => {
        return [...selectedNotes.value];
    };
    const select = (...editNotes: EditNote[]) => {
        console.log("select", editNotes.length);
        selectedNotes.value.clear();
        selectedNotes.value = new Set(editNotes);
    };
    const toggle = (...editNotes: EditNote[]) => {
        editNotes.forEach((n) => {
            if (selectedNotes.value.has(n)) {
                selectedNotes.value.delete(n);
            } else {
                selectedNotes.value.add(n);
            }
        });
    };
    const remove = (...editNotes: (EditNote)[]) => {
        editNotes.forEach((n) => {
            if (!n) return;
            selectedNotes.value.delete(n);
        });
    }
    const add = (...editNote: (EditNote)[]) => {
        editNote.forEach((n) => {
            if (!n) return;
            selectedNotes.value.add(n);
        });
    };
    const selectRange = (range: {
        startTime: number,
        endTime: number,
        startOctave: number,
        endOctave: number
    }) => {
        select(...getNotesInRange(
            editNotes.list,
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
            editNotes.list,
            range
        );
        add(...newNotes);
    };
    const clear = () => {
        console.log("clear");
        selectedNotes.value.clear();
    };
    const selectAll = () => {
        select(...editNotes.list);
    };
    throttledWatch(selectedNotes, refreshNoteSelectionState);

    return {
        selectRange,
        selectAll,
        addRange,
        add, select, toggle, get,
        clear: clear, remove,
        isEditNoteSelected,
    };

});
