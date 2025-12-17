import { ExistsOptions, ReadDirOptions, ReadFileOptions, WriteFileOptions } from "@tauri-apps/plugin-fs";
import { tauriObject } from "./isTauri";

/**
 * object that has a ready to use type before tauriObjectPromise is
 * resolved, so that it can be used right away.
 * Each function call awaits tauriObjectPromise to resolve
 */
export default (() => {
    const fsPromise = tauriObject().then(tauri => tauri.fs);
    const pathPromise = tauriObject().then(tauri => tauri.path);
    
    const readTextFile = async (path: string, options?: ReadFileOptions | undefined):Promise<string> => {
        const fs = await fsPromise;
        return fs.readTextFile(path, options);
    }
    const readDir = async (dir: string, options?: ReadDirOptions | undefined) => {
        const fs = await fsPromise;
        return fs.readDir(dir, options);
    }
    const exists = async (path: string, options: ExistsOptions | undefined): Promise<boolean> => {
        const fs = await fsPromise;
        return fs.exists(path, options);
    }
    const readBinaryFile = async (path: string, options: ReadFileOptions | undefined): Promise<Uint8Array> => {
        const fs = await fsPromise;
        return fs.readFile(path, options);
    }
    const writeFile = async (path: string, contents: Uint8Array<ArrayBufferLike> | ReadableStream<Uint8Array<ArrayBufferLike>>, options?: WriteFileOptions | undefined): Promise<void> => {
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