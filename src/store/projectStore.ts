import { defineStore } from 'pinia';
import { ref, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { LibraryItem } from './libraryStore.js';
import { usePlaybackStore } from './playbackStore.js';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore.js';

export const useProjectStore = defineStore("current project", () => {
    /** todo: rename to something unambiguous **/
    const score = ref([] as Array<EditNote>);
    const view = useViewStore();
    const snaps = useSnapStore();
    const edited = ref(Date.now().valueOf() as Number);
    const created = ref(Date.now().valueOf() as Number);
    const playbackStore = usePlaybackStore();
    const name = ref("unnamed (autosave)" as string);

    const getSnapsList = (): LibraryItem["snaps"] => Object.keys(snaps.values).map((key) => {
        return [key, snaps.values[key].active];
    });

    const getProjectDefintion = (): LibraryItem => {
        const ret = {
            name: name.value,
            notes: score.value.map(note => note.note),
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


    const getTimeBounds = () => {
        // get the the note with the lowest start
        if(score.value.length === 0) {
            return {
                start: 0,
                end: 0,
                first: null,
                last: null,
            }
        }
        let first = score.value[0].note;
        score.value.forEach(({note}) => {
            if (note.start < first.start) {
                first = note;
            }
        });
        let last = score.value[0].note;
        score.value.forEach(({note}) => {
            if ((note.end || note.start) > (last.end || last.start)) {
                last = note;
            }
        });
        if (!last.end) throw new Error("last.end is undefined");
        return {
            start: first.start,
            end: last.end,
            first, last,
        }
    }

    const setFromProjecDefinition = (pDef: LibraryItem) => {
        name.value = pDef.name;
        created.value = pDef.created;
        edited.value = pDef.edited;
        score.value = pDef.notes.map(note => new EditNote(note, view));
        
        console.log(pDef.notes.filter(note=>note.mute))
        if (pDef.instrument) {
            playbackStore.setSynthByName(pDef.instrument.type);
        }

        pDef.snaps.forEach(([name, activeState]) => {
            if (!snaps.values[name]) return;
            snaps.values[name].active = activeState;
        });
    }

    return {
        score,
        name, edited, created, snaps,
        getTimeBounds,
        getProjectDefintion,
        setFromProjecDefinition,
    }

});