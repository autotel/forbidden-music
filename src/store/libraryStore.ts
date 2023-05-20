import LZUTF8 from 'lzutf8';
import { defineStore } from 'pinia';
import { nextTick, ref, watch, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { Note, makeNote } from '../dataTypes/Note.js';
import { SynthParam } from '../synth/SynthInterface.js';
import { useProjectStore } from './projectStore.js';
import { useScoreStore } from './scoreStore.js';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore.js';


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

const reservedEntryName = "forbidden-music";

const saveToLocalStorage = (filename: string, inValue: LibraryItem) => {
    if (filename === reservedEntryName) throw new Error(`filename cannot be "${reservedEntryName}"`);
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
    return Object.keys(localStorage).filter(n => n !== reservedEntryName);
}

const exists = (filename: string) => {
    return localStorage.getItem(filename) !== null;
}

const deleteItem = (filename: string) => {
    localStorage.removeItem(filename);
}

export const useLibraryStore = defineStore("library store", () => {
    const view = useViewStore();
    const score = useScoreStore();
    const snaps = useSnapStore();
    const projectStore = useProjectStore();


    const filenamesList = ref([] as Array<string>);
    const inSyncWithStorage = ref(false);
    const errorMessage = ref("");



    setTimeout(() => {
        loadFromLibraryItem(projectStore.name);
        let autosaveCall = () => {
            if (projectStore.name === "unnamed (autosave)") {
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
            if (exists(projectStore.name)) {
                throw new Error("File already exists");
            }

            saveToLocalStorage(projectStore.name, {
                notes: score.notes,
                name: projectStore.name,
                created: projectStore.created,
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
            saveToLocalStorage(projectStore.name, {
                notes: score.notes,
                name: projectStore.name,
                created: projectStore.created,
                edited: projectStore.edited,
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
            projectStore.name = item.name;
            projectStore.created = item.created;
            projectStore.edited = item.edited;
            projectStore.list = item.notes.map(note => new EditNote(note, view));
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
        projectStore.list = [];
        inSyncWithStorage.value = false;
    };

    watch([projectStore, snaps.values], () => inSyncWithStorage.value = false);

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
        a.download = projectStore.name + ".json";
        a.click();
    }

    const exportJSON = () => {
        const json = JSON.stringify(score.notes);
        downloadString(json, "application/json", projectStore.name + ".json");
    }

    const exportMIDIPitchBend = () => {
    }

    const importJSON = (files: FileList) => {
        const file = files[0];
        const filename = file.name.replace(/.json\b/i, "");
        projectStore.name = filename;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const json = JSON.parse(text);
            projectStore.list = json.map((note: any) => new EditNote({
                frequency: note.frequency,
                start: note.start,
                duration: note.duration,
            }, view));
        }
        reader.readAsText(file);
    }

    const importObject = (iobj: PossibleImportObjects) => {
        if ('notes' in iobj && Array.isArray(iobj.notes)) {
            projectStore.list = iobj.notes.map(note => new EditNote({
                frequency: note.frequency,
                start: note.start,
                duration: note.duration,
            }, view));
        } else if (Array.isArray(iobj)) {
            projectStore.list = iobj.map(note => new EditNote({
                frequency: note.frequency,
                start: note.start,
                duration: note.duration,
            }, view));
        }
    }

    udpateItemsList();

    return {
        clear,

        saveToNewLibraryItem,
        loadFromLibraryItem,
        saveCurrent,
        deleteItemNamed,

        exportJSON,
        importJSON,
        exportMIDIPitchBend,
        importObject,

        filenamesList,
        errorMessage,
        inSyncWithStorage,
    }

});