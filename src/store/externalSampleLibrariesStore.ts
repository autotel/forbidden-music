import { assertSampleKitDefinition, SampleKitDefinition } from "@/dataTypes/SampleKitDefinition";
import { assertSampleLibraryDefinition, SamplesLibraryDefinition } from "@/dataTypes/SampleLibraryDefinition";
import { tauriObject } from "@/functions/isTauri";
import { FileEntry } from "@tauri-apps/api/fs";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import userSettingsStorageFactory from "./userSettingsStorageFactory";

export const libPathIsRemote = (libPath: string) => {
    return !(libPath.startsWith('file://') || libPath.startsWith('/'));
}

const recursiveFileSearch = async <T>(
    dir: string,
    foundCallback: (path: string) => T,
    depthLeft: number = 5,
) => {
    const { fs } = await tauriObject();
    const results: T[] = [];
    try {
        const entries: FileEntry[] = await fs.readDir(dir);
        for (const entry of entries) {
            if (entry.children) {
                if (depthLeft > 0) {
                    const subResults = await recursiveFileSearch(
                        entry.path, foundCallback, depthLeft - 1
                    );
                    results.push(...subResults);
                } else {
                    console.warn("Max depth reached in", dir);
                }
            } else {
                const found = await foundCallback(entry.path);
                if (found) {
                    results.push(found);
                }
            }
        }
    } catch (e) {
        console.error('Error reading dir', dir, e);
    }
    return results;
}

const getLibrariesFrom = async (path: string, accumulator: {
    libraries: SamplesLibraryDefinition[],
    kits: SampleKitDefinition[],
}) => {
    const isNamingsFilename = path.endsWith('namings.json');
    const isSamplesKitFilename = path.endsWith('samplesKit.json');
    const isSamplesLibraryFilename = path.endsWith('samplesLibrary.json');
    if (isNamingsFilename) {
        return false; // not implemented
    } else if (isSamplesKitFilename) {
        const kit = await loadAndParseSamplesKitFile(path);
        if (kit) {
            accumulator.kits.push(kit);
        }
    } else if (isSamplesLibraryFilename) {
        const lib = await loadAndParseSamplesLibraryFile(path);
        if (lib) {
            accumulator.libraries.push(lib);
        }
    }
}

const loadAndParseNamingsFile = async (path: string): Promise<SampleKitDefinition | false> => {
    console.warn('Namings dynamic loading not implemented', path);
    return false;
    const { fs } = await tauriObject();
    const fileContent = await fs.readTextFile(path);
    const parsed = JSON.parse(fileContent);
}

const loadAndParseSamplesKitFile = async (path: string): Promise<SampleKitDefinition | false> => {
    try {
        const { fs } = await tauriObject();
        const fileContent = await fs.readTextFile(path);
        const parsed = JSON.parse(fileContent);
        const asserted = assertSampleKitDefinition(parsed);
        return asserted;
    } catch (e) {
        console.error('Error parsing samples file', path, e);
        return false;
    }
}

const loadAndParseSamplesLibraryFile = async (libDefPath: string): Promise<SamplesLibraryDefinition | false> => {
    try {
        const { fs, path } = await tauriObject();
        const fileContent = await fs.readTextFile(libDefPath);
        const parsed = JSON.parse(fileContent);
        const asserted = assertSampleLibraryDefinition({
            ...parsed,
            url: await path.resolve(libDefPath),
        });
        // libDefPath points to the json file, we need the folder
        const pathBase = await path.resolve(libDefPath, '../');
        for (const kit of asserted.content) {

            for (const sample of kit.samples) {
                sample.path = await path.resolve(pathBase, sample.path);
            };
        }
        return asserted;
    } catch (e) {
        console.error('Error parsing samples file', libDefPath, e);
        return false;
    }
}

const listLocalSampleKits = async () => {
    const result = {
        libraries: [] as SamplesLibraryDefinition[],
        kits: [] as SampleKitDefinition[],
    };
    const userSampĺesDirs = [
        // './',
        './user sound libs',
        // await path.resourceDir(),
        // await path.appDataDir(),
        // await path.appConfigDir(),
        // await path.audioDir(),
        // await path.executableDir(),
        // await path.appCacheDir(),
        // await path.documentDir(),
        // '/home/joaquin',
    ];
    for (const dir of userSampĺesDirs) {
        try {
            await recursiveFileSearch(dir, async (path) => {
                await getLibrariesFrom(path, result);
            });
        } catch (e) {
            console.log("cannot access", dir, e);
        }
    }
    console.log('local samples found:', result);
    return result;
}

export default defineStore('externalSampleLibrariesStore', () => {

    const listOfExternalLibs = ref([] as SamplesLibraryDefinition[]);

    const listOfAvailableSampleKits = computed(() => {
        return [...listOfExternalLibs.value.flatMap(lib => lib.content)];
    });

    const alreadyAddedLibs = [] as Url[];

    const addLibraryUrl = async (definitionUrl: string) => {
        let error = '';
        if (alreadyAddedLibs.includes(definitionUrl)) {
            return;
        }
        alreadyAddedLibs.push(definitionUrl);

        try {
            const newDef = await fetch(definitionUrl).then(res => res.json());
            const checkedList = assertSampleLibraryDefinition(newDef);

            listOfExternalLibs.value = [...listOfExternalLibs.value, {
                ...checkedList,
                url: definitionUrl,
                error,
            }];


        } catch (e) {
            listOfExternalLibs.value = [...listOfExternalLibs.value, {
                url: definitionUrl,
                name: '',
                error: e + '',
                content: [],
            }];
            alreadyAddedLibs.splice(alreadyAddedLibs.indexOf(definitionUrl), 1);
        }
    }

    const removeLibraryUrl = (definitionUrl: string) => {
        listOfExternalLibs.value = listOfExternalLibs.value.filter(({ url }) => url !== definitionUrl);
        alreadyAddedLibs.splice(alreadyAddedLibs.indexOf(definitionUrl), 1);
    }
    // addLibraryUrl('http://127.0.0.1:3010/samplesLibrary.json');
    // addLibraryUrl('http://autotel-forbidden-music.atwebpages.com/samples.json');

    (async () => {
        const { kits, libraries } = await listLocalSampleKits();
        listOfExternalLibs.value.push(...libraries);
        listOfExternalLibs.value.push({
            url: 'local',
            name: 'user',
            content: kits,
        });
    })();

    type Url = string;
    type SerializedLibsValue = Array<Url>;

    const serializeValue = (): SerializedLibsValue => {
        return listOfExternalLibs.value.map(lib => lib.url);
    }

    const applyValue = (value: SerializedLibsValue) => {
        const existing = [...listOfExternalLibs.value.flatMap(lib => lib.url)];
        const newLibs = value.filter((lib: Url) => !existing.includes(lib));
        const removedLibs = existing.filter((lib: Url) => !value.includes(lib));
        for (const lib of newLibs) {
            addLibraryUrl(lib);
        }
        for (const lib of removedLibs) {
            removeLibraryUrl(lib);
        }
    }

    const nsLocalStorage = userSettingsStorageFactory();

    // Sync with local storage
    (async () => {
        const savedLibs = await nsLocalStorage.getItem('externalSampleLibraries');
        console.log("try load user external samples", savedLibs)
        if (savedLibs) {
            try {
                const parsed = JSON.parse(savedLibs);
                applyValue(parsed);
            } catch (e) {
                console.error('error parsing externalSampleLibraries', e);
            }
        }
        watch(listOfExternalLibs, (value, oldValue) => {
            nsLocalStorage.setItem('externalSampleLibraries', JSON.stringify(serializeValue()));
        });
    })();

    const resetValue = () => {
        listOfExternalLibs.value = [];
        alreadyAddedLibs.length = 0;
        addLibraryUrl('audio/samples.json');
    }

    if(listOfExternalLibs.value.length === 0) {
        resetValue();
    }

    return {
        listOfExternalLibs,
        listOfAvailableSampleKits,
        addLibraryUrl, removeLibraryUrl,
        serializeValue, applyValue,
        resetValue,
    }
});