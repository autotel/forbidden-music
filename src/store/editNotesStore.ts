import { defineStore, storeToRefs } from 'pinia'
import { computed, nextTick, ref, Ref, watch, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { makeNote, Note } from '../dataTypes/Note.js';
import { useScoreStore } from './scoreStore.js';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore.js';
import LZUTF8 from 'lzutf8';
import { useToolStore } from './toolStore.js';


interface LibraryItem {
    notes: Array<Note>;
    name: string;
    created: Number;
    edited: Number;
    snaps: Array<[string, boolean]>
}

const appNameToRemove = "forbidden-music";

const saveToLocalStorage = (filename: string, inValue: LibraryItem) => {
    if (filename === appNameToRemove) throw new Error(`filename cannot be "${appNameToRemove}"`);
    const value: any = inValue as LibraryItem;
    value.notes = inValue.notes.map(note => ({
        frequency: note.frequency,
        start: note.start,
        duration: note.duration,
    }));
    localStorage.setItem(filename, LZUTF8.compress(JSON.stringify(value), { outputEncoding: "BinaryString" }));
}
const retrieveFromLocalStorage = (filename: string) => {
    const storageItem = localStorage.getItem(filename);
    if (!storageItem) throw new Error(`storageItem "${filename}" is ${storageItem}`);
    const retrieved = JSON.parse(LZUTF8.decompress(storageItem, { inputEncoding: "BinaryString" }));
    if (!retrieved) throw new Error("retrieved is undefined");
    retrieved.notes = retrieved.notes.map((note: any) => makeNote(note));
    return retrieved as LibraryItem;
}

const listLocalStorageFiles = () => {
    return Object.keys(localStorage).filter(n => n !== appNameToRemove);
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
    const snaps = useSnapStore();

    const filenamesList = ref([] as Array<string>);
    const edited = ref(Date.now().valueOf() as Number);
    const created = ref(Date.now().valueOf() as Number);
    const name = ref("unnamed (autosave)" as string);
    const inSyncWithStorage = ref(false);
    const errorMessage = ref("");

    setTimeout(() => {
        loadFromLibraryItem(name.value);
        let autosaveCall = () => {
            if (name.value === "unnamed (autosave)") {
                saveCurrent();
            }
        }
        setInterval(autosaveCall, 1000);
    },100);

    const getSnapsList = (): LibraryItem["snaps"] => Object.keys(snaps.values).map((key) => {
        return [key, snaps.values[key].active];
    });
    const saveToNewLibraryItem = () => {
        try {
            if (exists(name.value)) {
                throw new Error("File already exists");
            }

            saveToLocalStorage(name.value, {
                notes: score.notes,
                name: name.value,
                created: created.value,
                edited: Date.now().valueOf(),
                snaps: getSnapsList(),
            });

            inSyncWithStorage.value = true;
        } catch (e) {
            console.error("could not save", e);
            errorMessage.value = String(e);
        }

        udpateItemsList();
    }

    const saveCurrent = () => {
        try {
            saveToLocalStorage(name.value, {
                notes: score.notes,
                name: name.value,
                created: created.value,
                edited: edited.value,
                snaps: getSnapsList(),
            });
            inSyncWithStorage.value = true;
        } catch (e) {
            console.error("could not save", e);
            errorMessage.value = String(e);
        }
        udpateItemsList();
    }


    const udpateItemsList = () => {
        filenamesList.value = listLocalStorageFiles();
    }

    const loadFromLibraryItem = (filename: string) => {
        try {
            clear();
            const item = retrieveFromLocalStorage(filename);
            console.log("opening", item);
            score.notes = item.notes;
            name.value = item.name;
            created.value = item.created;
            edited.value = item.edited;
            list.value = item.notes.map(note => new EditNote(note, view));
            item.snaps.forEach(([name,activeState])=>{
                if(!snaps.values[name]) return;
                snaps.values[name].active = activeState;
            });
            nextTick(() => {
                inSyncWithStorage.value = true;
            });

        } catch (e) {
            console.error("coould not load", e);
            errorMessage.value = String(e);
        }
    }

    const deleteItemNamed = (filename: string) => {
        deleteItem(filename);
        udpateItemsList();
    }

    const clear = () => {
        list.value = [];
        inSyncWithStorage.value = false;
    };

    // TODO: is a store the right place where to put this??
    // when list changes, also change score
    watchEffect(() => {
        inSyncWithStorage.value = false;
        score.notes = list.value.map(note => note.note);
    });

    watch(name, () => inSyncWithStorage.value = false);
    watch(snaps.values, () => inSyncWithStorage.value = false);

    watchEffect(() => {
        if (errorMessage.value) {
            setTimeout(() => {
                errorMessage.value = "";
            }, 2000);
        }
    });

    udpateItemsList();

    return {
        list,
        clear,

        saveToNewLibraryItem,
        loadFromLibraryItem,
        saveCurrent,
        deleteItemNamed,

        filenamesList,
        errorMessage,
        name,
        edited,
        created,
        inSyncWithStorage,
    }

});