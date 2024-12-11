import { FileEntry, FsDirOptions, FsOptions } from "@tauri-apps/api/fs";
import { tauriObject } from "./isTauri";

/**
 * object that has a ready to use type before tauriObjectPromise is
 * resolved, so that it can be used right away.
 * Each function call awaits tauriObjectPromise to resolve
 */
export default (() => {
    const fsPromise = tauriObject().then(tauri => tauri.fs);
    const pathPromise = tauriObject().then(tauri => tauri.path);
    
    const readTextFile = async (path: string, options?: FsOptions):Promise<string> => {
        const fs = await fsPromise;
        return fs.readTextFile(path, options);
    }
    const readDir = async (dir: string, options?: FsDirOptions): Promise<FileEntry[]> => {
        const fs = await fsPromise;
        return fs.readDir(dir, options);
    }
    const exists = async (path: string, options: FsOptions): Promise<boolean> => {
        const fs = await fsPromise;
        return fs.exists(path, options);
    }
    const readBinaryFile = async (path: string, options: FsOptions): Promise<Uint8Array> => {
        const fs = await fsPromise;
        return fs.readBinaryFile(path, options);
    }
    const writeFile = async (path: string, contents: string, options?: FsOptions): Promise<void> => {
        const fs = await fsPromise;
        return fs.writeFile(path, contents, options);
    }

    return {
        readTextFile,
        readDir,
        exists,
        readBinaryFile,
        writeFile
    }
})();