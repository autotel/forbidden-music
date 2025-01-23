import { describe, expect, it } from 'vitest';
import { note } from '@/dataTypes/Note';
import { appCleanup } from '@/test-helpers/appCleanup';
import { appMount } from '@/test-helpers/appSetup';
import { wait } from '@/test-helpers/RoboMouse';
let generalInterval = 500;


describe('app setup helper', async () => {

    let testRuntime = null as null | Awaited<ReturnType<typeof appMount>>;

    it('is generated correctly', async () => {

        testRuntime = await appMount();

        const {
            interactionTarget,
            roboMouse,
            viewStore,
            notesStore,
            selectStore,
        } = testRuntime;

        expect(notesStore.list.length).toEqual(0)
    }, generalInterval);
    
    it('is generated correctly', async () => {

        if(!testRuntime) {
            throw new Error(`test rintime is ${testRuntime}`);
        }

        const {
            interactionTarget,
            roboMouse,
            viewStore,
            notesStore,
            selectStore,
            loopsStore,
        } = testRuntime;

        expect(notesStore.list.length).toEqual(0)
        expect(loopsStore.list.length).toEqual(0)
    }, generalInterval);

    if(testRuntime) appCleanup(testRuntime);
});
