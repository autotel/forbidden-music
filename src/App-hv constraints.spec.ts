import { afterAll, describe, expect, it } from 'vitest';
import { note } from './dataTypes/Note';
import { Tool } from './dataTypes/Tool';
import './style.css';
import { appMount } from './test-helpers/appSetup';
import { wait } from './test-helpers/utils';
import { appCleanup } from './test-helpers/appCleanup';
let generalInterval = 500;


describe('app', async () => {

    const testRuntime = await appMount();
    const {
        interactionTarget,
        roboMouse,
        viewStore,
        projectStore,
        selectStore,
        snapStore,
        toolStore,
        app,
    } = testRuntime;


    it('can constrain note dragging to be only horizontal', async () => {
        const timeDiv = 4;
        Object.keys(snapStore.values).forEach(key => {
            snapStore.values[key].active = false;
        });
        projectStore.clearScore();
        const noteToInsert = note({
            time: 0,
            timeEnd: 2,
            octave: 4.1,
            layer: 0
        })
        projectStore.appendNote(noteToInsert);
        roboMouse.currentPosition = { x: 0, y: 0 };
        expect(projectStore.notes.length).toBe(1);
        expect(projectStore.notes[0].octave).toBeCloseTo(noteToInsert.octave);
        toolStore.disallowOctaveChange = true;
        // preparation ended, test the thing
        const noteToDrag = projectStore.notes[0];
        const start = {
            x: viewStore.timeToPxWithOffset(noteToDrag.time),
            y: viewStore.octaveToPxWithOffset(noteToDrag.octave),
        }
        const end = {
            x: viewStore.timeToPxWithOffset(noteToDrag.time + 1),
            y: viewStore.octaveToPxWithOffset(noteToDrag.octave + 1),
        }
        await roboMouse.moveTo(start, 0);
        roboMouse.mousedown();
        await roboMouse.moveTo(end, generalInterval / timeDiv);
        roboMouse.mouseup();
        await wait(generalInterval / timeDiv);
        expect(projectStore.notes[0].octave).toEqual(noteToInsert.octave);
    });

    appCleanup(testRuntime);
});
