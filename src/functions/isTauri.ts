const forever = () => new Promise(() => { });
import {
    BaseDirectory,
    exists,
    readBinaryFile,
    readDir,
    readTextFile,
    writeFile,
    writeTextFile,
} from '@tauri-apps/api/fs';

import { invoke } from '@tauri-apps/api';
import { open, save } from '@tauri-apps/api/dialog';
import { listen } from '@tauri-apps/api/event';
import {
    appCacheDir,
    appConfigDir,
    appDataDir,
    appLocalDataDir,
    appLogDir,
    audioDir,
    basename,
    cacheDir,
    configDir,
    dataDir,
    delimiter,
    desktopDir,
    dirname,
    documentDir,
    downloadDir,
    executableDir,
    extname,
    fontDir,
    homeDir,
    isAbsolute,
    join,
    localDataDir,
    normalize,
    pictureDir,
    publicDir,
    resolve,
    resolveResource,
    resourceDir,
    runtimeDir,
    sep,
    templateDir,
    videoDir
} from '@tauri-apps/api/path';

const tauriObjectPromise = (async () => {
    if (!isTauri()) await forever();

    return {
        invoke, listen,
        fs: {
            readTextFile, BaseDirectory,
            writeFile, writeTextFile,
            readDir,
            exists,
            readBinaryFile
        },
        dialog: {
            open,
            save,
        },
        path: {
            appCacheDir,
            appConfigDir,
            appDataDir,
            appLocalDataDir,
            appLogDir,
            audioDir,
            basename,
            cacheDir,
            configDir,
            dataDir,
            delimiter,
            desktopDir,
            dirname,
            documentDir,
            downloadDir,
            executableDir,
            extname,
            fontDir,
            homeDir,
            isAbsolute,
            join,
            localDataDir,
            normalize,
            pictureDir,
            publicDir,
            resolve,
            resolveResource,
            resourceDir,
            runtimeDir,
            sep,
            templateDir,
            videoDir
        }
    }
})();

// make sure to also allow whatever new capabilities in tauri config
export const tauriObject = async () => {
    return await tauriObjectPromise;
}

export default function isTauri() {
    try {
        // @ts-ignore
        return window.__TAURI__ ? true : false;
    } catch (e) {
        return false;
    }
}

export function ifTauri(callback: (tauriInstance: ReturnType<typeof tauriObject>) => void) {
    if (isTauri()) {
        callback(tauriObject());
    }
    return {
        else: (callback: () => void) => {
            if (!isTauri()) {
                callback();
            }
        },
        elseLog: (message: string) => {
            if (!isTauri()) {
                console.log(message);
            }
        }
    }
}
