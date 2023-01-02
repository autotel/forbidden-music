import { defineStore } from 'pinia'
import { computed, ref, Ref, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { Note } from '../dataTypes/Note.js';
import { useScoreStore } from './scoreStore.js';
import { useViewStore } from './viewStore.js';

export const useEditNotesStore = defineStore("list", () => {
    const list = ref([] as Array<EditNote>);
    const view = useViewStore();
    const score = useScoreStore();
    const getTimeBounds = computed(() => {
        // get the the note with the lowest start
        const first: EditNote = list.value.reduce((acc, editNote) => {
            if (editNote.note.start < acc.note.start) {
                return editNote;
            } else {
                return acc;
            }
        });
        const last: EditNote = list.value.reduce((acc, editNote) => {
            if (!acc.note.end) throw new Error("acc.end is undefined");
            if (editNote.note.end > acc.note.end) {
                return editNote;
            } else {
                return acc;
            }
        });
        if (!last.note.end) throw new Error("last.end is undefined");
        return {
            start: first.note.start,
            end: last.note.end,
            first, last,
        }
    });

    const clear = () => {
        list.value = [];
    };

    // TODO: is a store the right place where to put this??
    // when list changes, also change score
    watchEffect(() => {
        score.notes = list.value.map(note => note.note);
    });

    return {
        list,
        getTimeBounds,
        clear,
    }

});