import { readTextFile, BaseDirectory, writeFile, writeTextFile } from '@tauri-apps/api/fs';
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
import { open, save } from '@tauri-apps/api/dialog';

// make sure to also allow whatever new capabilities in tauri config
const tauriObject = () => ({
    fs: {
        readTextFile, BaseDirectory,
        writeFile, writeTextFile,
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
})

export default function isTauri() {
    // @ts-ignore
    return window.__TAURI__ ? true : false;
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
