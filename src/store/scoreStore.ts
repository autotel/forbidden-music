import { defineStore } from 'pinia'
import { ref, Ref } from 'vue';
import { Note } from '../dataTypes/Note.js';
import { View } from '../View.js';

export const useScoreStore = defineStore("score", {
    state: () => ({
        notes: [] as Array<Note>,
    }),
    getters: {
        getTimeBounds() {
            // get the the note with the lowest start
            const first: Note = this.notes.reduce((acc, note) => {
                if (note.start < acc.start) {
                    return note;
                } else {
                    return acc;
                }
            });
            const last: Note = this.notes.reduce((acc, note) => {
                if (!acc.end) throw new Error("acc.end is undefined");
                if (note.end > acc.end) {
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
    },
    actions: {
    },

});