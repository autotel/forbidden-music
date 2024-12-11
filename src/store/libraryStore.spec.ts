import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useLibraryStore } from './libraryStore';
import { useProjectStore } from './projectStore';
import demoProject from './project-default';
import nsLocalStorage from '../functions/browserLocalStorage';
import { useLoopsStore } from './loopsStore';
import { useNotesStore } from './notesStore';

describe('Library store', () => {
    setActivePinia(createPinia());
    beforeAll(async() => {
        await nsLocalStorage.instance.clear();
    });
    it('can be instanced', () => {
        const projectStore = useProjectStore();
        const libraryStore = useLibraryStore();
        projectStore.loadDemoProjectDefinition();
        console.log(libraryStore.filenamesList);
    });
    it('can save a project', () => {
        const projectStore = useProjectStore();
        const libraryStore = useLibraryStore();
        projectStore.loadDemoProjectDefinition();
        libraryStore.saveCurrent();
    });
    it('can save the project', () => {
        const projectStore = useProjectStore();
        const libraryStore = useLibraryStore();
        projectStore.loadDemoProjectDefinition();
        projectStore.setFromProjectDefinition(
            demoProject
        );
        projectStore.name = "test";
        expect(localStorage.length).toBeGreaterThan(1);
        libraryStore.saveCurrent();
    });
    it('can save, and then load the project', () => {
        const projectStore = useProjectStore();
        const notesStore = useNotesStore();
        const libraryStore = useLibraryStore();
        const loopsStore = useLoopsStore();
        projectStore.loadDemoProjectDefinition();
        projectStore.setFromProjectDefinition({
            ...demoProject,
            name: "test"
        });
        libraryStore.saveCurrent();
        projectStore.loadEmptyProjectDefinition();
        expect(notesStore.list.length).toBe(0);
        expect(loopsStore.list.length).toBe(0);
        expect([...projectStore.lanes.lanes].length).toBe(0);
        libraryStore.loadFromLibraryItem("test");
        expect(notesStore.list.length).toEqual(demoProject.notes.length);
        expect(loopsStore.list.length).toEqual(demoProject.loops.length);
        expect([...projectStore.lanes.lanes].length).toEqual(demoProject.lanes.length);
    });
});