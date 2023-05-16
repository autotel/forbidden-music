import { defineStore } from 'pinia'
import { ref, Ref } from 'vue';
import { Note } from '../dataTypes/Note.js';


export const useScoreStore = defineStore("score", () => {
    const notes = ref([] as Array<Note>);

    const getTimeBounds = () => {
        // get the the note with the lowest start
        const first: Note = notes.value.reduce((acc, note) => {
            if (note.start < acc.start) {
                return note;
            } else {
                return acc;
            }
        });
        const last: Note = notes.value.reduce((acc, note) => {
            if (!acc.end) throw new Error("acc.end is undefined");
            if (note.end || note.start > acc.end) {
                return note;
            } else {
                return acc;
            }
        });
        if (!last.end) throw new Error("last.end is undefined");
        return {
            start: first.start,
            end: last.end,
            first, last,
        }
    }

    const toMIDIPitchBend = () => {
    }



    return {
        notes,
        toMIDIPitchBend,
        getTimeBounds,
    };
});