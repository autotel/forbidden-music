import LZUTF8 from 'lzutf8';
import { defineStore } from 'pinia';
import { nextTick, ref, watch, watchEffect } from 'vue';
import { AutomationLane } from '../dataTypes/AutomationLane';
import { AutomationPointDef } from '../dataTypes/AutomationPoint';
import { LoopDef } from '../dataTypes/Loop';
import { Note, NoteDef, note } from '../dataTypes/Note';
import nsLocalStorage from '../functions/nsLocalStorage';
import { SynthParamStored } from '../synth/SynthInterface';
import { userShownDisclaimerLocalStorageKey } from '../texts/userDisclaimer';
import { useProjectStore } from './projectStore';
import { useViewStore } from './viewStore';
import userCustomPerformanceSettingsKey from './userCustomPerformanceSettingsKey';

const version = "0.4.0";
export const LIBRARY_VERSION = version;

interface LibraryItem_0_1_0 {
    version: string;
    name: string;
    notes: Array<{ [key: string]: number | false } & { groupId: number }>;
    created: Number;
    edited: Number;
    snaps: Array<[string, boolean]>;
    instrument?: {
        type: string;
        params: Array<SynthParamStored>;
    };
    bpm?: number;
}

interface LibraryItem_0_2_0 extends LibraryItem_0_1_0 {
    layers: {
        channelSlot: number;
        visible: boolean;
        locked: boolean;
    }[];
    channels: {
        type: string;
        params: Array<SynthParamStored>;
    }[];
    customOctavesTable?: number[];
    snap_simplify?: number;
}


type LibraryItem_0_3_0 = {

    version: string;
    name: string;
    created: Number;
    edited: Number;
    snaps: Array<[string, boolean]>;
    instrument?: {
        type: string;
        params: Array<SynthParamStored>;
    };
    bpm?: number;


    layers: {
        channelSlot: number;
        visible: boolean;
        locked: boolean;
    }[];
    channels: {
        type: string;
        params: Array<SynthParamStored>;
    }[];
    customOctavesTable?: number[];
    snap_simplify?: number;

    notes: NoteDef[];
    loops: LoopDef[];
    automations?: AutomationPointDef[];
}

type LibraryItem_0_4_0 = {

    version: string;
    name: string;
    created: Number;
    edited: Number;
    snaps: Array<[string, boolean]>;
    instrument?: {
        type: string;
        params: Array<SynthParamStored>;
    };
    bpm?: number;
    layers: {
        channelSlot: number;
        visible: boolean;
        locked: boolean;
    }[];
    channels: {
        type: string;
        params: Array<SynthParamStored>;
    }[];
    customOctavesTable?: number[];
    snap_simplify?: number;

    notes: NoteDef[];
    loops: LoopDef[];
    lanes: AutomationLane[];
}

export type LibraryItem = LibraryItem_0_4_0;

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
    "0.1.0": (obj: LibraryItem_0_1_0): LibraryItem_0_2_0 => {
        const newObj = Object.assign({}, obj) as LibraryItem_0_2_0 & {
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
    "0.2.0": (obj: LibraryItem_0_1_0): LibraryItem_0_3_0 => {
        const newObj = Object.assign({
            loops: [],
        }, obj) as unknown as LibraryItem_0_3_0 & {
            loops: [],
        };
        newObj.version = "0.3.0";
        return newObj;
    },
    "0.3.0": (obj: LibraryItem_0_1_0): LibraryItem_0_4_0 => {
        const newObj = Object.assign({
            lanes: [],
        }, obj) as unknown as LibraryItem_0_4_0 & {
            lanes: [],
        };
        newObj.version = "0.4.0";
        return newObj;
    },
}



type PossibleImportObjects = LibraryItem | Array<Note>

const reservedEntryNames = [
    "forbidden-music",
    userShownDisclaimerLocalStorageKey,
    userCustomPerformanceSettingsKey,
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
        clear();
        console.log("opening", filename);
        try {
            const item = retrieveFromLocalStorage(filename);
            importObject(item);
            nextTick(() => {
                inSyncWithStorage.value = true;
            });
        } catch (e) {
            console.warn("could not load", e);
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
            // assuming iobj is an array of notes
            const newNotes = iobj.map(note);
            project.appendNote(...newNotes);
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