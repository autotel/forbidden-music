import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { Note } from '../dataTypes/Note';
import { useProjectStore } from './projectStore';
import { useToolStore } from './toolStore';
import { useViewStore } from './viewStore';

const getNotesInRange = (
    notes: EditNote[],
    range: {
        startTime: number,
        endTime: number,
        startOctave: number,
        endOctave: number
    }
) => {
    const timeRange = [range.startTime, range.endTime].sort();
    const octaveRange = [range.startOctave, range.endOctave].sort();
    return notes.filter(({ note }) => {
        const octaveInRange = note.octave >= octaveRange[0] && note.octave <= octaveRange[1];
        const timeInRange = note.start >= timeRange[0] && note.start <= timeRange[1];
        return octaveInRange && timeInRange;
    });
};



export const useSelectStore = defineStore("select", () => {
    const view = useViewStore();
    const selectedNotes = ref(new Set() as Set<EditNote>);
    const editNotes = useProjectStore();
    const refreshNoteSelectionState = () => {
        editNotes.list.forEach(n => n.selected = isEditNoteSelected(n))
    }
    const get = () => {
        return [...selectedNotes.value];
    };
    const select = (...editNotes: EditNote[]) => {
        selectedNotes.value.clear();
        selectedNotes.value = new Set(editNotes);
        refreshNoteSelectionState();
    };
    const toggle = (...editNotes: EditNote[]) => {
        editNotes.forEach((n) => {
            if (selectedNotes.value.has(n)) {
                selectedNotes.value.delete(n);
            } else {
                selectedNotes.value.add(n);
            }
        });
        refreshNoteSelectionState();
    };
    const remove = (...editNotes: (EditNote)[]) => {
        editNotes.forEach((n) => {
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
            editNotes.list,
            range
        ));
        refreshNoteSelectionState();
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
        refreshNoteSelectionState();
    };
    const clear = () => {
        console.log("clear");
        selectedNotes.value.clear();
        refreshNoteSelectionState();
    };
    const isEditNoteSelected = (note: EditNote) => {
        return selectedNotes.value.has(note);
    };
    watch(selectedNotes, refreshNoteSelectionState);

    return {
        // selectedNotes:selectedNotes.value,
        // selectedNotes,
        selectRange,
        addRange,
        add, select, toggle, get,
        clear: clear, remove,
        isEditNoteSelected,
        // toggleEditNoteSelected,
    };

});
