import { describe, expect, it } from 'vitest';
import { note } from '@/dataTypes/Note';
import { appCleanup } from '@/test-helpers/appCleanup';
import { appMount } from '@/test-helpers/appSetup';
import { wait } from '@/test-helpers/RoboMouse';
import { TestRuntime } from '@/test-helpers/testRuntime';
let generalInterval = 500;


describe('app setup helper', async () => {

    let testRuntime: TestRuntime | null = null;

    it('is generated correctly', async () => {

        testRuntime = await appMount() as TestRuntime;

        if (!testRuntime) {
            throw new Error('testRuntime is null');
        }

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
            throw new Error(`test runtime is ${testRuntime}`);
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
