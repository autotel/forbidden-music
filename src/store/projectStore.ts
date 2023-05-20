import { useRefHistory } from '@vueuse/core';
import LZUTF8 from 'lzutf8';
import { defineStore } from 'pinia';
import { nextTick, ref, watch, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { Note, makeNote } from '../dataTypes/Note.js';
import { SynthParam } from '../synth/SynthInterface.js';
import { useScoreStore } from './scoreStore.js';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore.js';


export const useProjectStore = defineStore("current project", () => {
    const list = ref([] as Array<EditNote>);
    const view = useViewStore();
    const score = useScoreStore();
    const snaps = useSnapStore();
    const edited = ref(Date.now().valueOf() as Number);
    const created = ref(Date.now().valueOf() as Number);

    const name = ref("unnamed (autosave)" as string);

    const { history, undo, redo } = useRefHistory(list);


    // TODO: is a store the right place where to put this??
    // when list changes, also change score
    watchEffect(() => {
        score.notes = list.value.map(note => note.note);
    });

    return {
        list,
        name,edited,created,
        history, undo, redo,

    }

});