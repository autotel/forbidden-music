import { sanitizeTimeRanges } from '@/dataTypes/TimelineItem';
import { Note, NoteDef, note, noteDef } from '../dataTypes/Note';
import { compress } from "lzutf8";
import { defineStore } from "pinia";
import { ref } from "vue";
import { tryDecompressAndParseArray } from '@/functions/tryDecompressAndParseArray';
import { ProjectTraceContentsStore } from '@/dataTypes/ProjectContentsStore';
import { useLayerStore } from './layerStore';

export const useNotesStore = defineStore('notes score', () => {

    const list = ref<Note[]>([]);
    const layers = useLayerStore();

    const updateLayersToList = (notes:Note[] = list.value) => {
        notes.forEach((note) => {
            layers.getOrMakeLayerWithIndex(note.layer);
        });

    }

    const sort = (notes: Note[] = list.value) => {
        notes.sort((a, b) => {
            return a.time - b.time;
        });
    }
    /** Convert notes to note defs */
    const serialize = (notes: Note[] = list.value) => notes.map(noteDef);

    const stringify =  (notes: Note[] = list.value, zip: boolean = false) => {
        let str = JSON.stringify(serialize(notes));
        if (zip) str = compress(str, { outputEncoding: "Base64" });
        return str;
    }
    /** Convert note defs to notes */
    const deserialize = (defs: NoteDef[]) => defs.map(note);

    const setFromDefs = (defs: NoteDef[]) => {
        list.value = deserialize(defs);
        updateLayersToList();
    }

    const parse =  (str: string): Note[] => {
        let noteDefs = tryDecompressAndParseArray<NoteDef>(str, (maybeNote) => {
            if (typeof maybeNote !== "object") return false;
            if (null === maybeNote) return false;
            if (!('time' in maybeNote)) return false;
            if (!('timeEnd' in maybeNote || 'duration' in maybeNote)) return false;
            if (!('octave' in maybeNote)) return false;
            if (!('velocity' in maybeNote)) return false;
            if (!('mute' in maybeNote)) return false;
            if (!('layer' in maybeNote)) return false;
            return true
        });

        const editNotes = noteDefs.map(note);

        if (editNotes.length === 0) {
            console.log("no notes found in parsed text");
            return [];
        }

        sanitizeTimeRanges(...editNotes);
        updateLayersToList(editNotes);
        return editNotes;
    }

    const clear = () => {
        list.value = [];
    }

    const set = (notes: Note[]) => {
        list.value = notes;
        updateLayersToList(notes);
    }

    const append = (...notes: Note[]) => {
        list.value.push(...notes);
        updateLayersToList(notes);
    }
    
    const returnValue = {
        list,
        append,
        clear,
        set,
        sort,
        serialize,
        deserialize,
        stringify,
        parse,
        setFromDefs,
    };
    return returnValue;
});