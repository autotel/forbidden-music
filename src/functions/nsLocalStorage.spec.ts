import { describe, expect, it } from 'vitest';
import nsLocalStorage from './browserLocalStorage';
describe('nslocalstorage', () => {
    const targetStorage = nsLocalStorage._storage;

    const newItem = 'test-item';
    const key = 'test';

    const reset = () => {
        nsLocalStorage.clear();
        targetStorage.clear();
    }

    it('stores to localstorage with namespace', () => {
        reset();
        const nsKey = nsLocalStorage.nameSpaceKey(key);
        nsLocalStorage.setItem('test', newItem);
        expect(targetStorage.getItem(nsKey)).toBe(newItem);
    });

    it('retrieves from localstorage with namespace', () => {
        reset();
        const nsKey = nsLocalStorage.nameSpaceKey(key);
        nsLocalStorage.setItem('test', newItem);
        expect(nsLocalStorage.getItem('test')).toBe(newItem);
    });

    it('clears', () => {
        reset();
        const localStorageNamespacedKeys = [];
        const nsLocalStorageKeys = nsLocalStorage.getKeys();

        for (var i = 0, len = localStorage.length; i < len; ++i) {
            const keyNo = localStorage.key(i);
            if(keyNo !== null && (!localStorage.isNameSpaced(keyNo))) {
                localStorageNamespacedKeys.push(keyNo);
            }
        }

        expect(nsLocalStorageKeys.length).toBe(0);
        expect(localStorageNamespacedKeys.length).toBe(0);
    });

    it('deletes item', () => {
        reset();
        const nsKey = nsLocalStorage.nameSpaceKey(key);
        nsLocalStorage.setItem('test', newItem);
        nsLocalStorage.removeItem('test');
        expect(nsLocalStorage.getItem('test')).toBe(undefined);
        expect(targetStorage.getItem(nsKey)).toBe(null);
    });

    it('does not list deleted keys', () => {
        reset();
        nsLocalStorage.setItem('test', newItem);
        nsLocalStorage.removeItem('test');
        expect(nsLocalStorage.getKeys()).toEqual([]);
    });
});