import LZUTF8 from 'lzutf8';
import { defineStore } from 'pinia';
import { nextTick, ref, watch, watchEffect } from 'vue';
import { Note, NoteDefb } from '../dataTypes/Note';
import { SynthParamStored } from '../synth/SynthInterface';
import { useProjectStore } from './projectStore';
import { useViewStore } from './viewStore';
import { userShownDisclaimerLocalStorageKey } from '../texts/userDisclaimer';
import { userCustomPerformanceSettings } from './customSettingsStore';
import nsLocalStorage from '../functions/nsLocalStorage';

const version = "0.2.0";


export interface LibraryItem_0_1_0 {
    version: string;
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

const migrators = {
    "0.0.0": (obj: any) => {
        obj.version = "0.1.0";
        obj.notes = obj.notes.map((note: any) => {
            note.time = note.start;
            note.timeEnd = note.end;
            console.log(note);
            return note;
        });
        if (!obj.bpm) obj.bpm = 120;
        return obj;
    },
    "0.1.0": (obj: LibraryItem_0_1_0): LibraryItem => {
        const newObj = Object.assign({}, obj) as LibraryItem & {
            instrument?: {
                type: string;
                params: Array<SynthParamStored>;
            }
        };
        newObj.version = "0.2.0";
        newObj.layers = [];
        newObj.channels = [];
        if (obj.instrument) {
            newObj.channels.push(obj.instrument);
            delete newObj.instrument;
        }
        return newObj;
    },
}



export type GroupNoteDef = NoteDefb & {
    groupId: number;
}

export interface LibraryItem {
    version: string;
    name: string;
    notes: Array<GroupNoteDef>;
    created: Number;
    edited: Number;
    snaps: Array<[string, boolean]>;
    customOctavesTable?: number[];
    snap_simplify?: number;
    channels: {
        type: string;
        params: Array<SynthParamStored>;
    }[];
    layers: {
        channelSlot: number;
        visible: boolean;
        locked: boolean;
    }[];
    bpm: number;
}

type PossibleImportObjects = LibraryItem | Array<Note>

const reservedEntryNames = [
    "forbidden-music",
    userShownDisclaimerLocalStorageKey,
    userCustomPerformanceSettings,
];

const normalizeLibraryItem = (obj: any): LibraryItem => {
    if (!obj.version) obj.version = "0.0.0";
    while (obj.version in migrators) {
        // @ts-ignore
        const migrator = migrators[obj.version];
        console.log("version " + obj.version + " detected, migrating");
        obj = migrator(obj);
    }
    return obj;
}

const saveToLocalStorage = (filename: string, inValue: LibraryItem) => {
    inValue.version = version;
    if (reservedEntryNames.includes(filename)) throw new Error(`filename cannot be "${reservedEntryNames}"`);
    const value: any = inValue as LibraryItem;
    nsLocalStorage.setItem(filename, LZUTF8.compress(JSON.stringify(value), { outputEncoding: "BinaryString" }));
}

const retrieveFromLocalStorage = (filename: string) => {
    const storageItem = nsLocalStorage.getItem(filename);
    if (!storageItem) throw new Error(`storageItem "${filename}" is ${storageItem}`);
    let retrieved = JSON.parse(LZUTF8.decompress(storageItem, { inputEncoding: "BinaryString" }));
    if (!retrieved) throw new Error("retrieved is undefined");
    retrieved = normalizeLibraryItem(retrieved);
    // retrieved.notes = retrieved.notes.map((note: any) => new Note(note));
    return retrieved as LibraryItem;
}

const listLocalStorageFiles = () => {
    return Object.keys(nsLocalStorage).filter(n => !reservedEntryNames.includes(n));
}

const exists = (filename: string) => {
    return nsLocalStorage.getItem(filename) !== null;
}

const deleteItem = (filename: string) => {
    nsLocalStorage.removeItem(filename);
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


    const exportMIDIPitchBend = () => {
    }

    const importJSONFileList = (files: FileList) => {
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
            iobj = normalizeLibraryItem(iobj);
            project.setFromProjectDefinition(iobj as LibraryItem);
        } else if (Array.isArray(iobj)) {
            project.setFromListOfNoteDefinitions(iobj);
        }
    }

    udpateItemsList();

    window.onfocus = () => {
        nsLocalStorage.syncFromLocalStorage();
    }

    return {
        clear,

        saveToNewLibraryItem,
        loadFromLibraryItem,
        saveCurrent,
        deleteItemNamed,

        importJSONFileList,
        exportMIDIPitchBend,
        importObject,

        version,
        filenamesList,
        errorMessage,
        inSyncWithStorage,
    }

});