import { AsyncStorage } from "@/store/userSettingsStorageFactory";

const namespace = 'ndpr-87b834';

const mockLocalStorage = new (class MStorage implements Storage {
  length: number = 0;
  key = (index: number) => null;
  clear = () => { }
  getItem = (key: string) => null;
  removeItem = () => { }
  setItem = () => { }
})();

const localStorageOrMock = () => {
  try {
    return localStorage
  } catch (e) {
    console.warn("using fake localStorage");
    return mockLocalStorage;
  }
}

const _storage = localStorageOrMock();

// The asynchronicity of this storage is only to have the same footprint as the TauriNsLocalStorage

export default class NsLocalStorage implements AsyncStorage {
  storage: Map<string, string | undefined> = new Map();
  readonly _storage: Storage = _storage;
  readonly _namespace: string = namespace;
  async syncToLocalStorage() {
    const keys = this.storage.keys();
    for (const key of keys) {
      const cachedResult = await this.getItem(key);
      let nsKey = this.nameSpaceKey(key);
      // console.log("sync nsLocalstorage to localstorage", key, cachedResult !== undefined);
      if (cachedResult === null || cachedResult === undefined) {
        console.log("removing", key);
        _storage.removeItem(nsKey);
      } else {
        _storage.setItem(nsKey, cachedResult);
      }
    }
  }
  nameSpaceKey(key: string) {
    return `${namespace}/${key}`;
  }
  deNameSpaceKey(key: string) {
    return key.replace(`${namespace}/`, '');
  }
  isNameSpaced(key: string) {
    return key.startsWith(namespace);
  }
  async syncFromLocalStorage() {
    // console.log("sync nsLocalstorage from localstorage");
    const keys = Object.keys(_storage);
    for (const key of keys) {
      if (this.isNameSpaced(key)) {
        const deNamespacedKey = this.deNameSpaceKey(key);
        const cachedResult = this.storage.get(deNamespacedKey);
        const result = _storage.getItem(key);
        if (result !== null && result !== cachedResult) {
          this.setItem(deNamespacedKey, result);
        }
      }
    }
  }
  async setItem(key: string, value: string) {
    this.storage.set(key, value);
    await this.syncToLocalStorage();
  }
  async getItem(key: string) {
    const result = this.storage.get(key) || null;
    return result;
  }
  async key(index: number): Promise<string | null> {
    return (await this.getKeys())[index] || null;
  }
  async removeItem(key: string) {
    this.storage.set(key, undefined);
    await this.syncToLocalStorage();
    this.storage.delete(key);
  }
  async clear() {
    this.storage.clear();
    await this.syncToLocalStorage();
  }
  async getKeys(): Promise<string[]> {
    return [...this.storage.keys()];
  }
  get length(): number {
    return this.storage.size;
  }
  static instance: NsLocalStorage;
  constructor(skipSync = false) {
    if(NsLocalStorage.instance) {
      console.error("NsLocalStorage should be a singleton");
      return NsLocalStorage.instance;
    }

    if (!skipSync) {
      this.syncFromLocalStorage();
    }
    NsLocalStorage.instance = this;
  }
}