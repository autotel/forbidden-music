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

class NsLocalStorage implements Storage {
  [name: string]: any;
  syncToLocalStorage() {
    const keys = Object.keys(this);
    for (const key of keys) {
      const result = this.getItem(key);
      if (result === null) {
        _storage.removeItem(`${namespace}/${key}`);
      } else {
        _storage.setItem(`${namespace}/${key}`, result);
      }
    }
  }
  syncFromLocalStorage() {
    console.log("sync nsLocalstorage from localstorage");
    // get items from actual localstorage, 
    // use it only at the beginning
    // perhaps at window re-focus too.
    const keys = Object.keys(_storage);
    for (const key of keys) {
      const deNamespacedKey = key.replace(`${namespace}/`, '');
      if (key.startsWith(`${namespace}/`)) {
        // result is kinda guaranteed not to be null in this context
        const result = _storage.getItem(key);
        if (result !== this[deNamespacedKey] && result !== null) {
          this.setItem(deNamespacedKey, result);
        }
      }
    }
  }
  setItem(key: string, value: string) {
    this[key] = value;
    this.syncToLocalStorage();
  }
  getItem(key: string): string | null {
    return this[key] || null;
  }
  removeItem(key: string) {
    delete this[key];
    this.syncToLocalStorage();
  }
  clear() {
    this.syncToLocalStorage();
  }
  key(index: number): string | null {
    return Object.keys(this)[index];
  }
  get length(): number {
    return Object.keys(this).length;
  }
}
const nsLocalStorage = new NsLocalStorage();
nsLocalStorage.syncFromLocalStorage();
export default nsLocalStorage;