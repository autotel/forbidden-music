import { defineStore } from 'pinia'

export const useTestStore = defineStore("test", () => {
    const testStore = { hello: 1 };
    return testStore;
});