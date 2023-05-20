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
import { LibraryItem } from './libraryStore.js';
import { usePlaybackStore } from './playbackStore.js';

export const useProjectStore = defineStore("current project", () => {
    const list = ref([] as Array<EditNote>);
    const view = useViewStore();
    const score = useScoreStore();
    const snaps = useSnapStore();
    const edited = ref(Date.now().valueOf() as Number);
    const created = ref(Date.now().valueOf() as Number);
    const playbackStore = usePlaybackStore();
    const name = ref("unnamed (autosave)" as string);

    const { history, undo, redo } = useRefHistory(list);

    const getSnapsList = (): LibraryItem["snaps"] => Object.keys(snaps.values).map((key) => {
        return [key, snaps.values[key].active];
    });
    const getProjectDefintion = (): LibraryItem => {
        const ret = {
            name: name.value,
            notes: list.value.map(note => note.note),
            created: created.value,
            edited: edited.value,
            snaps: getSnapsList(),
        } as LibraryItem;
        if (playbackStore.synth) {
            ret.instrument = {
                type: playbackStore.synth.name,
                // not worth implementing yet
                params: [],
            }
        }
        return ret;
    }

    const setFromProjecDefinition = (pDef: LibraryItem) => {
        
        score.notes = pDef.notes;
        name.value = pDef.name;
        created.value = pDef.created;
        edited.value = pDef.edited;
        list.value = pDef.notes.map(note => new EditNote(note, view));
        if(pDef.instrument){
            playbackStore.setSynthByName(pDef.instrument.type);
        }

        pDef.snaps.forEach(([name, activeState]) => {
            if (!snaps.values[name]) return;
            snaps.values[name].active = activeState;
        });
    }


    // TODO: is a store the right place where to put this??
    // when list changes, also change score
    watchEffect(() => {
        score.notes = list.value.map(note => note.note);
    });

    return {
        list,
        name, edited, created, snaps,
        history, undo, redo,
        getProjectDefintion,
        setFromProjecDefinition,
    }

});