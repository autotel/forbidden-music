import { describe, expect, it } from 'vitest';
import NsLocalStorage from './browserLocalStorage';
describe('nslocalstorage', () => {
    const storage = new NsLocalStorage();
    const targetStorage = storage._storage;
    const newItem = 'test-item';
    const key = 'test';

    const reset = () => {
        storage.clear();
        targetStorage.clear();
    }

    it('stores to localstorage with namespace',async () => {
        reset();
        const nsKey = await storage.nameSpaceKey(key);
        await storage.setItem('test', newItem);
        expect(await targetStorage.getItem(nsKey)).toBe(newItem);
    });

    it('retrieves from localstorage with namespace',async () => {
        reset();
        await storage.nameSpaceKey(key);
        await storage.setItem('test', newItem);
        expect(await storage.getItem('test')).toBe(newItem);
    });

    it('clears',async () => {
        reset();
        const localStorageNamespacedKeys = [];
        const nsLocalStorageKeys = await storage.getKeys();

        for (var i = 0, len = localStorage.length; i < len; ++i) {
            const keyNo = localStorage.key(i);
            if(keyNo !== null && (!localStorage.isNameSpaced(keyNo))) {
                localStorageNamespacedKeys.push(keyNo);
            }
        }

        expect(nsLocalStorageKeys.length).toBe(0);
        expect(localStorageNamespacedKeys.length).toBe(0);
    });

    it('deletes item',async () => {
        reset();
        const nsKey = storage.nameSpaceKey(key);
        await storage.setItem('test', newItem);
        await storage.removeItem('test');
        expect(await storage.getItem('test')).toBe(null);
        expect(await targetStorage.getItem(nsKey)).toBe(null);
    });

    it('does not list deleted keys',async () => {
        reset();
        await storage.setItem('test', newItem);
        await storage.removeItem('test');
        expect(await storage.getKeys()).toEqual([]);
    });
});