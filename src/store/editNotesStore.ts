import { defineStore, storeToRefs } from 'pinia'
import { computed, nextTick, ref, Ref, watch, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { makeNote, Note } from '../dataTypes/Note.js';
import { useScoreStore } from './scoreStore.js';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore.js';
import LZUTF8 from 'lzutf8';
import { useToolStore } from './toolStore.js';
import { useRefHistory } from '@vueuse/core';
import { SynthParam } from '../synth/SynthInterface.js';


interface LibraryItem {
    notes: Array<Note>;
    name: string;
    created: Number;
    edited: Number;
    snaps: Array<[string, boolean]>;
    instrument?: {
        type: string;
        params: Array<SynthParam>;
    };
}

type PossibleImportObjects = LibraryItem | Array<Note>

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



    const { history, undo, redo } = useRefHistory(list);

    setTimeout(() => {
        loadFromLibraryItem(name.value);
        let autosaveCall = () => {
            if (name.value === "unnamed (autosave)") {
                saveCurrent();
            }
        }
        setInterval(autosaveCall, 1000);
    }, 100);

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
            item.snaps.forEach(([name, activeState]) => {
                if (!snaps.values[name]) return;
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


    const downloadString = (text: string, fileType: string, fileName: string) => {
        const blob = new Blob([text], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = name.value + ".json";
        a.click();
    }

    const exportJSON = () => {
        const json = JSON.stringify(score.notes);
        downloadString(json, "application/json", name.value + ".json");
    }

    const exportMIDIPitchBend = () => {
    }

    const importJSON = (files: FileList) => {
        const file = files[0];
        const filename = file.name.replace(/.json\b/i, "");
        name.value = filename;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const json = JSON.parse(text);
            list.value = json.map((note: any) => new EditNote({
                frequency: note.frequency,
                start: note.start,
                duration: note.duration,
            }, view));
        }
        reader.readAsText(file);
    }

    const importObject = (iobj: PossibleImportObjects) => {
        if ('notes' in iobj && Array.isArray(iobj.notes)) {
            list.value = iobj.notes.map(note => new EditNote({
                frequency: note.frequency,
                start: note.start,
                duration: note.duration,
            }, view));
        } else if (Array.isArray(iobj)) {
            list.value = iobj.map(note => new EditNote({
                frequency: note.frequency,
                start: note.start,
                duration: note.duration,
            }, view));
        }
    }

    udpateItemsList();

    return {
        list,
        clear,

        saveToNewLibraryItem,
        loadFromLibraryItem,
        saveCurrent,
        deleteItemNamed,

        history, undo, redo,

        exportJSON,
        importJSON,
        exportMIDIPitchBend,
        importObject,

        filenamesList,
        errorMessage,
        name,
        edited,
        created,
        inSyncWithStorage,
    }

});