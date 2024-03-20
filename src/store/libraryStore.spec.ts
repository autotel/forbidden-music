import { createPinia, setActivePinia } from 'pinia';
import { beforeAll, describe, expect, it, vitest } from 'vitest';
import { useLibraryStore } from './libraryStore';
import { useProjectStore } from './projectStore';
import demoProject from './project-default';
import nsLocalStorage from '../functions/nsLocalStorage';

describe('Library store', () => {
    setActivePinia(createPinia());
    beforeAll(() => {
        nsLocalStorage.clear();
    });
    it('can be instanced', () => {
        const projectStore = useProjectStore();
        const libraryStore = useLibraryStore();
        projectStore.loadDemoProjectDefinition();
        console.log(libraryStore.version);
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
        expect(localStorage.length).toBe(3);
        libraryStore.saveCurrent();
    });
    it('can save, and then load the project', () => {
        const projectStore = useProjectStore();
        const libraryStore = useLibraryStore();
        projectStore.loadDemoProjectDefinition();
        projectStore.setFromProjectDefinition({
            ...demoProject,
            name: "test"
        });
        libraryStore.saveCurrent();
        projectStore.loadEmptyProjectDefinition();
        expect(projectStore.notes.length).toBe(0);
        expect(projectStore.loops.length).toBe(0);
        expect([...projectStore.lanes.lanes].length).toBe(0);
        libraryStore.loadFromLibraryItem("test");
        expect(projectStore.notes.length).toEqual(demoProject.notes.length);
        expect(projectStore.loops.length).toEqual(demoProject.loops.length);
        expect([...projectStore.lanes.lanes].length).toEqual(demoProject.lanes.length);
    });
});