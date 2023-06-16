import LZUTF8 from 'lzutf8';
import { defineStore } from 'pinia';
import { nextTick, ref, watch, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { Note, NoteDefa, NoteDefb } from '../dataTypes/Note.js';
import { SynthParam, SynthParamMinimum, SynthParamStored } from '../synth/SynthInterface.js';
import { useProjectStore } from './projectStore.js';
import { useViewStore } from './viewStore.js';
import { Group } from '../dataTypes/Group.js';

export type GroupNoteDef = NoteDefb & {
    groupId: number;
}

export interface LibraryItem {
    name: string;
    notes: Array<GroupNoteDef>;
    created: Number;
    edited: Number;
    snaps: Array<[string, boolean]>;
    instrument?: {
        type: string;
        params: Array<SynthParamStored>;
    };
    bpm?: number;
}

type PossibleImportObjects = LibraryItem | Array<Note>

const reservedEntryName = "forbidden-music";

const saveToLocalStorage = (filename: string, inValue: LibraryItem) => {
    if (filename === reservedEntryName) throw new Error(`filename cannot be "${reservedEntryName}"`);
    const value: any = inValue as LibraryItem;
    value.notes = inValue.notes.map((groupedNote) => ({
        frequency: groupedNote.frequency,
        start: groupedNote.start,
        duration: groupedNote.duration,
        mute: groupedNote.mute,
    }));
    localStorage.setItem(filename, LZUTF8.compress(JSON.stringify(value), { outputEncoding: "BinaryString" }));
}
const retrieveFromLocalStorage = (filename: string) => {
    const storageItem = localStorage.getItem(filename);
    if (!storageItem) throw new Error(`storageItem "${filename}" is ${storageItem}`);
    const retrieved = JSON.parse(LZUTF8.decompress(storageItem, { inputEncoding: "BinaryString" }));
    if (!retrieved) throw new Error("retrieved is undefined");
    console.log("retrieved", retrieved.notes.filter((n: any) => n.mute !== false));
    retrieved.notes = retrieved.notes.map((note: any) => new Note(note));
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
    const project = useProjectStore();


    const filenamesList = ref([] as Array<string>);
    const inSyncWithStorage = ref(false);
    const errorMessage = ref("");


    const saveToNewLibraryItem = () => {
        try {
            if (exists(project.name)) {
                throw new Error("File already exists");
            }

            saveToLocalStorage(
                project.name,
                project.getProjectDefintion()
            );

            inSyncWithStorage.value = true;
        } catch (e) {
            console.error("could not save", e);
            errorMessage.value = String(e);
        }

        udpateItemsList();
    }

    const saveCurrent = () => {
        try {
            saveToLocalStorage(
                project.name,
                project.getProjectDefintion()
            );
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
            importObject(item);
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
        project.clearScore();
        inSyncWithStorage.value = false;
    };

    watch([project], () => inSyncWithStorage.value = false);

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
        a.download = project.name + ".json";
        a.click();
    }

    const exportJSON = () => {
        const json = JSON.stringify(project.getProjectDefintion());
        downloadString(json, "application/json", project.name + ".json");
    }

    const exportMIDIPitchBend = () => {
    }

    const importJSON = (files: FileList) => {
        const file = files[0];
        const filename = file.name.replace(/.json\b/i, "");
        project.name = filename;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const object = JSON.parse(text);
            importObject(object);
        }
        reader.readAsText(file);
    }

    const importObject = (iobj: PossibleImportObjects) => {
        if ('notes' in iobj && Array.isArray(iobj.notes)) {
            project.setFromProjecDefinition(iobj as LibraryItem);
        } else if (Array.isArray(iobj)) {
            project.setFromListOfNoteDefinitions(iobj);
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