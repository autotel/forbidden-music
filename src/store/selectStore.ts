import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { Note } from '../dataTypes/Note';
import { useScoreStore } from './scoreStore';

const getNotesInRange = (
    notes: Note[],
    range: {
        startTime: number,
        endTime: number,
        startOctave: number,
        endOctave: number
    }
) => {
    const timeRange = [range.startTime, range.endTime].sort();
    const octaveRange = [range.startOctave, range.endOctave].sort();
    return notes.filter((note) => {
        const octaveInRange = note.octave >= octaveRange[0] && note.octave <= octaveRange[1];
        const timeInRange = note.start >= timeRange[0] && note.start <= timeRange[1];
        return octaveInRange && timeInRange;
    });
};



export const useSelectStore = defineStore("select", () => {
    const selectedNotes = ref([] as Note[]);
    const score = useScoreStore();
    const refreshNoteSelectionState = () => {
        console.log("refresh2");
        score.notes.forEach((note) => {
            if (isNoteSelected(note)) {
                note.selected = true;
            }
        })
    }
    const selectRange = (range: {
        startTime: number,
        endTime: number,
        startOctave: number,
        endOctave: number
    }) => {
        selectedNotes.value = getNotesInRange(
            score.notes,
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
            score.notes,
            range
        );
        selectedNotes.value.push(...newNotes);
    };
    const clearSelection = () => {
        selectedNotes.value = [];
        refreshNoteSelectionState();
    };
    const isNoteSelected = (note: Note) => {
        return selectedNotes.value.includes(note);
    };
    const toggleNoteSelected = (note: Note) => {
        if (isNoteSelected(note)) {
            selectedNotes.value = selectedNotes.value.filter((n) => n != note);
        } else {
            selectedNotes.value.push(note);
        }
    };
    watch(selectedNotes, refreshNoteSelectionState);
    
    return {
        selectedNotes,
        selectRange,
        addRange,
        clearSelection,
        isNoteSelected,
        toggleNoteSelected,
    };

});
