import { afterAll, describe, expect, it } from 'vitest';
import { note } from './dataTypes/Note';
import { Tool } from './dataTypes/Tool';
import './style.css';
import { appMount } from './test-helpers/appSetup';
import { wait } from './test-helpers/RoboMouse';
import { appCleanup } from './test-helpers/appCleanup';
let generalInterval = 500;


describe('app horizontal and vertical constrained edits', async () => {

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
        Object.values(snapStore.values).forEach(value => {
            value.active = false;
        });
        toolStore.mouse.disallowOctaveChange = true;

        projectStore.clearScore();

        const noteToInsert = {
            time: 0,
            timeEnd: 2,
            octave: 4.1,
            layer: 0
        }
        projectStore.appendNote(note(noteToInsert));
        roboMouse.currentPosition = { x: 0, y: 0 };


        if (projectStore.notes.length < 1) {
            throw new Error("This test needs a one note to exist");
        }

        const noteToDrag = projectStore.notes[0];
        const noteBox = viewStore.rectOfNote(noteToDrag);

        const start = {
            x: noteBox.x + noteBox.radius,
            y: noteBox.y + noteBox.radius,
        }

        const end = {
            x: viewStore.timeToPxWithOffset(1),
            y: viewStore.octaveToPxWithOffset(5.6),
        }

        await roboMouse.moveTo(start, 100);
        await wait(100);
        roboMouse.mousedown();
        await wait(100);
        await roboMouse.moveTo(end, 100);
        await wait(100);

        expect(selectStore.getNotes().length).toBeGreaterThan(0)
        selectStore.select();
        if (selectStore.getNotes().length > 0) {
            throw new Error("Failed to reset selection");
        }

        await wait(100);

        expect(projectStore.notes[0].octave).toEqual(noteToInsert.octave);
    });

    it('horizontally constrained movement persists even when yielding note outside of snap possibilities', async () => {
        Object.values(snapStore.values).forEach(value => {
            value.active = false;
        });
        snapStore.values.equal1.active = true;
        toolStore.mouse.disallowOctaveChange = true;

        projectStore.clearScore();

        const noteToInsert = {
            time: 0,
            timeEnd: 2,
            octave: 4.1,
            layer: 0
        }
        projectStore.appendNote(note(noteToInsert));
        roboMouse.currentPosition = { x: 0, y: 0 };


        if (projectStore.notes.length < 1) {
            throw new Error("This test needs a one note to exist");
        }

        const noteToDrag = projectStore.notes[0];
        const noteBox = viewStore.rectOfNote(noteToDrag);

        const start = {
            x: noteBox.x + noteBox.radius,
            y: noteBox.y + noteBox.radius,
        }

        const end = {
            x: viewStore.timeToPxWithOffset(1),
            y: viewStore.octaveToPxWithOffset(5.6),
        }

        await roboMouse.moveTo(start, 100);
        await wait(100);
        roboMouse.mousedown();
        await wait(100);
        await roboMouse.moveTo(end, 100);
        await wait(100);
        roboMouse.mouseup();

        expect(selectStore.getNotes().length).toBeGreaterThan(0)
        selectStore.select();
        if (selectStore.getNotes().length > 0) {
            throw new Error("Failed to reset selection");
        }

        await wait(100);

        expect(projectStore.notes[0].octave).toEqual(noteToInsert.octave);
    });

    appCleanup(testRuntime);
});
