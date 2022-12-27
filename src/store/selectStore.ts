import { defineStore } from 'pinia';
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
    return notes.filter((note) => {
        return note.start >= range.startTime &&
            note.start < range.endTime &&
            note.octave >= range.startOctave &&
            note.octave < range.endOctave;
    });
};



export const useSelectStore = defineStore("select", {
    state: () => ({
        selectedNotes: [] as Note[],
        score: useScoreStore(),
    }),
    actions: {
        selectRange(range: {
            startTime: number,
            endTime: number,
            startOctave: number,
            endOctave: number
        }) {
            this.selectedNotes = getNotesInRange(
                this.score.notes,
                this.selectRange
            );
        },
        addRange(range: {
            startTime: number,
            endTime: number,
            startOctave: number,
            endOctave: number
        }) {
            const newNotes = getNotesInRange(
                this.score.notes,
                range
            );
            this.selectedNotes = this.selectedNotes.concat(newNotes);
        },
        clearSelection() {
            this.selectRange = {
                startTime: 0,
                endTime: 0,
                startOctave: 0,
                endOctave: 0,
            };
            this.selectedNotes = [];
        },
        isNoteSelected(note: Note) {
            return this.selectedNotes.includes(note);
        },
        toggleNoteSelected(note: Note) {
            if (this.isNoteSelected(note)) {
                this.selectedNotes = this.selectedNotes.filter((n) => n != note);
            } else {
                this.selectedNotes.push(note);
            }
        }
    },
});