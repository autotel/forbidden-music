import { defineStore } from 'pinia'
import { computed, ref, Ref, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { makeNote, Note } from '../dataTypes/Note.js';
import { useScoreStore } from './scoreStore.js';
import { useViewStore } from './viewStore.js';



interface LibraryItem {
    notes: Array<Note>;
    name: string;
    created: Number;
    edited: Number;
}

const saveToLocalStorage = (filename: string, value: LibraryItem) => {
    localStorage.setItem(filename, JSON.stringify(value));
}
const retrieveFromLocalStorage = (filename: string) => {
    const retrieved = localStorage.getItem(filename);
    if (!retrieved) throw new Error("retrieved is undefined");
    return JSON.parse(retrieved) as LibraryItem;
}
const listLocalStorageFiles = () => {
    return Object.keys(localStorage);
}
const exists = (filename: string) => {
    return localStorage.getItem(filename) !== null;
}
const deleteItem = (filename: string) => {
    localStorage.removeItem(filename);
}

export const useEditNotesStore = defineStore("list", () => {
    const list = ref([] as Array<EditNote>);
    const view = useViewStore();
    const score = useScoreStore();


    const edited = ref(Date.now().valueOf() as Number);
    const created = ref(Date.now().valueOf() as Number);
    const name = ref("Untitled Score" as string);


    const saveToNewLibraryItem = () => {
        // error if exists
        if (exists(name.value)) {
            throw new Error("File already exists");
        }
        saveToLocalStorage(name.value, {
            notes: score.notes,
            name: name.value,
            created: created.value,
            edited: Date.now().valueOf(),
        });
    }

    const saveCurrent = () => {
        saveToLocalStorage(name.value, {
            notes: score.notes,
            name: name.value,
            created: created.value,
            edited: edited.value,
        });
    }


    const getItemsList = () => {
        return listLocalStorageFiles();
    }

    const loadFromLibraryItem = (filename: string) => {
        const item = retrieveFromLocalStorage(filename);
        console.log("opening",item);
        score.notes = item.notes.map(note => makeNote(note));
        name.value = item.name;
        created.value = item.created;
        edited.value = item.edited;
    }


    const deleteItemNamed = (filename: string) => {
        deleteItem(filename);
    }


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
        clear,

        saveToNewLibraryItem,
        getItemsList,
        loadFromLibraryItem,
        saveCurrent,
        deleteItemNamed,

        name,
        edited,
        created,
    }

});