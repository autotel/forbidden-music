import { AsyncStorage } from "@/store/userSettingsStorageFactory";
import isTauri, { ifTauri, tauriObject } from "./isTauri";

const namespace = 'user-settings.json';

const createStorageFileIfNotExists = async (filePath: string) => {
  if(!isTauri()) {
    console.warn("Do not use createStorageFileIfNotExists outside of tauri");
    return;
  }
  const { fs } = await tauriObject();
  if (await fs.exists(filePath) && await fs.readTextFile(filePath) !== '') {
    return;
  }
  console.log("creating storage file", filePath);
  try {
    await fs.writeFile(filePath, '{}');
  } catch (e) {
    console.error('error creating storage file', filePath, e);
  }
}

const jsonOpen = async (filePath: string) => {
  await createStorageFileIfNotExists(filePath);
  if(!isTauri()) {
    console.warn("Do not use jsonOpen outside of tauri");
    return {};
  }
  const { fs } = await tauriObject();
  try {
    const result = await fs.readTextFile(filePath);
    return JSON.parse(result);
  } catch (e) {
    console.error('error opening storage from', filePath, e);
    return {};
  }
}

const jsonStore = async (filePath: string, data: any) => {
  if(!isTauri()) {
    console.warn("Do not use jsonStore outside of tauri");
    return;
  }
  const { fs } = await tauriObject();
  try {
    await fs.writeTextFile(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('error saving storage to', filePath, e);
  }
}

const mapToObject = (map: Map<string, string | undefined>) => {
  const obj: { [key: string]: string | undefined } = {};
  for (const [key, value] of map) {
    obj[key] = value;
  }
  return obj;
}

const objectToMap = (obj: { [key: string]: string | undefined }) => {
  const map = new Map<string, string | undefined>();
  for (const key in obj) {
    map.set(key, obj[key]);
  }
  return map;
}

export class TauriNsLocalStorage implements AsyncStorage {
  userSettingsPath = namespace;
  storage: Map<string, string | undefined> = new Map();
  readonly _namespace: string = namespace;
  static instance: TauriNsLocalStorage;
  
  ioLock: Promise<void> = Promise.resolve();
  errorTimeout: ReturnType<typeof setTimeout> | false = false;
  
  clearErrorTimeout = () => {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
      this.errorTimeout = false;
    }
  }

  lockIo = async (name: string) => {
    await this.ioLock;
    let resolve: () => void;
    let reject: (reason: any) => void;
    this.ioLock = new Promise((res,rej) => {
      resolve = res;
      reject = rej;
    });
    const resolveLock = () => {
      this.clearErrorTimeout();
      resolve();
    }
    this.errorTimeout = setTimeout(() => {
      reject("ioLock timeout for " + name);
    }, 500);

    return resolveLock;
  }

  waitIoUnlock = async () => {
    await this.ioLock;
  }

  async syncToLocalStorage () {
    console.log("sync tauriNsLocalstorage to", this.userSettingsPath);
    const releaseLock = await this.lockIo('sync to local storage');
    const obj = mapToObject(this.storage);
    await jsonStore(this.userSettingsPath, obj);
    releaseLock();
  }
  async syncFromLocalStorage() {
    console.log("sync tauriNsLocalstorage from", this.userSettingsPath);
    const releaseLock = await this.lockIo('sync from local storage');
    await this.ioLock;
    const obj = await jsonOpen(this.userSettingsPath);
    this.storage = objectToMap(obj);
    releaseLock();
  }
  async setItem(key: string, value: string) {
    this.storage.set(key, value);
    await this.syncToLocalStorage();
  }
  async getItem(key: string) {
    const result = this.storage.get(key) || null;
    return result;
  }
  async removeItem(key: string) {
    this.storage.set(key, undefined);
    this.storage.delete(key);
    await this.syncToLocalStorage();
  }
  async clear() {
    this.storage.clear();
    await this.syncToLocalStorage();
  }
  async getKeys(): Promise<string[]> {
    return [...this.storage.keys()];
  }
  async key(index: number): Promise<string | null> {
    return (await this.getKeys())[index] || null;
  }
  get length(): number {
    return this.storage.size;
  }
  constructor(skipLoad: boolean = false) {
    if (TauriNsLocalStorage.instance) {
      console.error("Creating a second instance of TauriNsLocalStorage is not recommended");
      return TauriNsLocalStorage.instance;
    }
    TauriNsLocalStorage.instance = this;
    if (!skipLoad) {
      this.syncFromLocalStorage();
    }
  }
}