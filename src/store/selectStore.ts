import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { Note } from '../dataTypes/Note';
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
    const selectedNotes = ref([] as EditNote[]);
    const refreshNoteSelectionState = () => {
        console.log("refreshNoteSelectionState");
        view.editNotes.forEach(n => n.selected = isEditNoteSelected(n))
    }
    const select = (...editNote: EditNote[]) => {
        selectedNotes.value = editNote;
    };

    const add = (... editNote: EditNote []) => {
        selectedNotes.value = selectedNotes.value.concat(editNote);
    };
    const selectRange = (range: {
        startTime: number,
        endTime: number,
        startOctave: number,
        endOctave: number
    }) => {
        selectedNotes.value = getNotesInRange(
            view.editNotes,
            range
        );
    };
    const addRange = (range: {
        startTime: number,
        endTime: number,
        startOctave: number,
        endOctave: number
    }) => {
        const newNotes = getNotesInRange(
            view.editNotes,
            range
        );
        selectedNotes.value.push(...newNotes);
    };
    const clear = () => {
        console.log("clear");
        selectedNotes.value = [];
    };
    const isEditNoteSelected = (note: EditNote) => {
        return selectedNotes.value.includes(note);
    };
    const toggleEditNoteSelected = (editNote: EditNote) => {
        if (isEditNoteSelected(editNote)) {
            selectedNotes.value = selectedNotes.value.filter((n) => n != editNote);
        } else {
            selectedNotes.value.push(editNote);
        }
    };

    watch(selectedNotes, refreshNoteSelectionState);

    return {
        // selectedNotes:selectedNotes.value,
        selectedNotes,
        selectRange,
        addRange,
        add,select,
        clear: clear,
        isEditNoteSelected,
        toggleEditNoteSelected,
    };

});
