const tauriObjectPromise = (async () => {
    const {
        readTextFile,
        BaseDirectory,
        writeFile,
        writeTextFile
    } = await require('@tauri-apps/api/fs');

    const {
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
    } = await require('@tauri-apps/api/path');
    const { open, save } = await require('@tauri-apps/api/dialog');

    const { invoke } = require("@tauri-apps/api");
    const { listen } = require("@tauri-apps/api/event");

    return {
        invoke, listen,
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
