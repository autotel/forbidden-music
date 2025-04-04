import { AUTOSAVE_PROJECTNAME } from '@/consts/ProjectName';
import { SynthChannelsDefinition } from '@/dataStructures/synthStructureFunctions';
import {
    LIBRARY_VERSION, LibraryItem, LibraryItem_0_1_0, LibraryItem_0_2_0, LibraryItem_0_3_0, LibraryItem_0_4_0,
    LibraryItem_0_5_0, OldFormatLibraryItem
} from '@/dataTypes/LibraryItem';
import { Note } from '@/dataTypes/Note';
import { SynthParamStored } from '@/synth/types/SynthParam';
import { userShownDisclaimerLocalStorageKey } from '@/texts/userDisclaimer';
import { compress, decompress } from 'lzutf8';
import { defineStore } from 'pinia';
import { nextTick, ref, watch, watchEffect } from 'vue';
import { useLoopsStore } from './loopsStore';
import { useNotesStore } from './notesStore';
import { useProjectStore } from './projectStore';
import userCustomPerformanceSettingsKey from './userCustomPerformanceSettingsKey';
import userSettingsStorageFactory from './userSettingsStorageFactory';
import sleep from '@/functions/sleep';
import { devLog } from '@/functions/isDev';


const migrators = {
    "0.0.0": (obj: any) => {
        obj.version = "0.1.0";
        obj.notes = obj.notes.map((note: any) => {
            note.time = note.start;
            note.timeEnd = note.end;
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
    "0.2.0": (obj: LibraryItem_0_2_0): LibraryItem_0_3_0 => {
        const newObj = Object.assign({
            loops: [],
        }, obj) as unknown as LibraryItem_0_3_0 & {
            loops: [],
        };
        newObj.version = "0.3.0";
        return newObj;
    },
    "0.3.0": (obj: LibraryItem_0_3_0): LibraryItem_0_4_0 => {
        const newObj = Object.assign({
            lanes: [],
        }, obj) as unknown as LibraryItem_0_4_0 & {
            lanes: [],
        };
        newObj.version = "0.4.0";
        return newObj;
    },
    "0.4.0": (obj: LibraryItem_0_4_0): LibraryItem_0_5_0 => {
        const newChans: SynthChannelsDefinition = obj.channels.map(({ type, params }) => (
            [{ type, params }]
        ));
        const newObj = {
            ...obj,
            channels: newChans,
        } as LibraryItem_0_5_0;
        newObj.version = LIBRARY_VERSION;
        return newObj;
    }
}

type PossibleImportObjects = OldFormatLibraryItem | LibraryItem | Array<Note>

const userSettingsStorage = userSettingsStorageFactory();

const reservedEntryNames = [
    "forbidden-music",
    "externalSampleLibraries",
    userShownDisclaimerLocalStorageKey,
    userCustomPerformanceSettingsKey,
];

export const normalizeLibraryItem = (obj: any): LibraryItem => {
    if (!obj.version) obj.version = "0.0.0";
    devLog("normalizing", obj.version);
    while (obj.version in migrators) {
        // @ts-ignore
        const migrator = migrators[obj.version];
        console.log("version " + obj.version + " detected, migrating");
        obj = migrator(obj);
    }
    return obj;
}

const saveToLocalStorage = async (filename: string, inValue: LibraryItem) => {
    inValue.version = LIBRARY_VERSION;
    if (reservedEntryNames.includes(filename)) throw new Error(`filename cannot be "${reservedEntryNames}"`);
    const value: any = inValue as LibraryItem;
    await userSettingsStorage.setItem(filename, compress(JSON.stringify(value), { outputEncoding: "BinaryString" }));
    console.log("saved to local storage", filename);
}

const retrieveFromLocalStorage = async (filename: string) => {
    const storageItem = await userSettingsStorage.getItem(filename);
    if (!storageItem) throw new Error(`storageItem "${filename}" is ${storageItem}`);
    let retrieved = JSON.parse(decompress(storageItem, { inputEncoding: "BinaryString" }));
    if (!retrieved) throw new Error("retrieved is undefined");
    retrieved = normalizeLibraryItem(retrieved);
    // retrieved.notes = retrieved.notes.map((note: any) => new Note(note));
    return retrieved as LibraryItem;
}

const listLocalStorageFiles = async () => {
    const keys = await userSettingsStorage.getKeys();

    return keys.filter((n: string) => !reservedEntryNames.includes(n));
}

const exists = (filename: string) => {
    return userSettingsStorage.getItem(filename) !== null;
}

const deleteItem = (filename: string) => {
    userSettingsStorage.removeItem(filename);
}

export const useLibraryStore = defineStore("library store", () => {
    const project = useProjectStore();
    const notes = useNotesStore();
    const filenamesList = ref([] as Array<string>);
    const inSyncWithStorage = ref(false);
    const errorMessage = ref("");
    const loops = useLoopsStore();
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

    const saveCurrent = (errorThrow: Boolean = false) => {
        try {
            saveToLocalStorage(
                project.name,
                project.getProjectDefintion()
            );
            inSyncWithStorage.value = true;
        } catch (e) {
            if(errorThrow) {
                throw e;
            }
            console.error("could not save", e);
            errorMessage.value = String(e);
        }
        udpateItemsList();
    }

    const autoSave = () => {

        if (project.name === AUTOSAVE_PROJECTNAME) {
            // thus saved as '(backup) Unnamed'
            saveCurrent();
        } else {
            if (project.name.includes("(autosave)")) {
                console.log("autosaving this project");
                try {
                    saveToLocalStorage(project.name, project.getProjectDefintion());
                } catch (e) {
                    console.error("could not save", e);
                    errorMessage.value = String(e);
                }
                udpateItemsList();
            }
        }

    }

    const udpateItemsList = async () => {
        filenamesList.value = await listLocalStorageFiles();
    }

    const loadFromLibraryItem = async (filename: string, throwError = false) => {
        clear();
        console.log("opening", filename);
        const item = await retrieveFromLocalStorage(filename);
        if(!item && throwError) throw new Error(`localStorage item named ${filename} is ${item}`);
        importObject(item);
        // setTimeout(() => {
        // },1);
        await sleep(1);
        inSyncWithStorage.value = true;
    }

    const deleteItemNamed = (filename: string) => {
        console.log("deleting", filename);
        deleteItem(filename);
        udpateItemsList();
    }

    const clear = () => {
        project.clearScore();
        inSyncWithStorage.value = false;
    };

    watch([
        project.lanes,
        loops.list,
        // project.snaps, // causes unsync on mouse move over viewport
        () => project.snaps.values,
        () => project.name,
        project.synths,
    ], () => inSyncWithStorage.value = false);

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
        console.log("importbject");
        if ('notes' in iobj && Array.isArray(iobj.notes)) {
            iobj = normalizeLibraryItem(iobj);
            project.setFromProjectDefinition(iobj as LibraryItem);
        } else if (Array.isArray(iobj)) {
            // assuming iobj is an array of notes
            notes.setFromDefs(iobj);
        }
    }

    udpateItemsList();

    window.onfocus = () => {
        userSettingsStorage.syncFromLocalStorage();
    }

    return {
        clear,

        saveToNewLibraryItem,
        loadFromLibraryItem,
        saveCurrent,
        autoSave,
        deleteItemNamed,

        importJSONFileList,
        exportMIDIPitchBend,
        importObject,

        filenamesList,
        errorMessage,
        inSyncWithStorage,
    }

});