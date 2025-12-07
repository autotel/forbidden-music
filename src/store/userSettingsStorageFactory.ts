import NsLocalStorage from "@/functions/browserLocalStorage";

export type AsyncStorage = {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
    clear: () => Promise<void>;
    getKeys: () => Promise<string[]>;
    syncFromLocalStorage: () => Promise<void>;
}

export default ():AsyncStorage => {
    // not working for now :(
    // if (isTauri()) {
    //     if(TauriNsLocalStorage.instance) {
    //         return TauriNsLocalStorage.instance;
    //     }
    //     return new TauriNsLocalStorage();
    // }else {
        if(NsLocalStorage.instance) {
            return NsLocalStorage.instance;
        }
        return new NsLocalStorage();
    // }
}