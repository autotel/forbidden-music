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

class NsLocalStorage {
  storage: Map<string, string | undefined> = new Map();
  readonly _storage: Storage = _storage;
  readonly _namespace: string = namespace;
  syncToLocalStorage() {
    const keys = this.storage.keys();
    for (const key of keys) {
      const cachedResult = this.getItem(key);
      let nsKey = this.nameSpaceKey(key);
      console.log("sync nsLocalstorage to localstorage", key, cachedResult !== undefined);
      if (cachedResult === undefined) {
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
  syncFromLocalStorage() {
    console.log("sync nsLocalstorage from localstorage");
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
  setItem(key: string, value: string) {
    this.storage.set(key, value);
    this.syncToLocalStorage();
  }
  getItem(key: string): string | undefined {
    const result = this.storage.get(key);
    return result;
  }
  removeItem(key: string) {
    this.storage.set(key, undefined);
    this.syncToLocalStorage();
    this.storage.delete(key);
  }
  clear() {
    this.storage.clear();
    this.syncToLocalStorage();
  }
  getKeys(): string[] {
    return [...this.storage.keys()];
  }
  get length(): number {
    return this.storage.size;
  }
}
const nsLocalStorage = new NsLocalStorage();
nsLocalStorage.syncFromLocalStorage();
export default nsLocalStorage;