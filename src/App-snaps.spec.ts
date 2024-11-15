import { afterAll, describe, expect, it } from 'vitest';
import { note } from './dataTypes/Note';
import { Tool } from './dataTypes/Tool';
import './style.css';
import { appMount } from './test-helpers/appSetup';
import { wait } from './test-helpers/RoboMouse';
import { appCleanup } from './test-helpers/appCleanup';
let generalInterval = 500;


describe('app snapping', async () => {

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


    it('snaps the created note to octave, if octave snap active', async () => {
        const timeDiv = 4;
        Object.values(snapStore.values).forEach((value) => {
            value.active = false;
        });
        // button with 1EDO text content
        const buttons = document.querySelectorAll("button")
        let edo1Button = Array.from(buttons).filter((button: HTMLElement) => button.textContent?.match("1EDO"))[0];
        if (!edo1Button) throw new Error("1EDO button not found");
        edo1Button.dispatchEvent(new MouseEvent("click", {
            bubbles: true,
        }));
        expect(snapStore.values.equal1?.active).toBe(true);
        const expectedNote = {
            time: 0,
            timeEnd: 2,
            octave: 4,
            layer: 0
        }
        const noteToInsert = {
            time: 0,
            timeEnd: 2,
            octave: 4.1,
            layer: 0
        }
        roboMouse.currentPosition = { x: 0, y: 0 };
        await roboMouse.moveTo({
            x: viewStore.timeToPxWithOffset(noteToInsert.time),
            y: viewStore.octaveToPxWithOffset(noteToInsert.octave),
        }, generalInterval / timeDiv);
        roboMouse.mousedown();
        await roboMouse.moveTo({
            x: viewStore.timeToPxWithOffset(noteToInsert.timeEnd),
            y: viewStore.octaveToPxWithOffset(noteToInsert.octave),
        }, generalInterval / timeDiv);
        roboMouse.mouseup();
        await wait(generalInterval / timeDiv);
        expect(projectStore.notes.list.length).toBe(1);
        expect(projectStore.notes.list[0].octave).toEqual(expectedNote.octave);
    }, generalInterval);

    it('creates a note without snapping if no snap is active', async () => {
        const timeDiv = 4;

        Object.values(snapStore.values).forEach((value) => {
            value.active = false;
        });
        projectStore.notes.list.length = 0;
        const noteToInsert = {
            time: 0,
            timeEnd: 2,
            octave: 4.1,
            layer: 0
        }
        roboMouse.currentPosition = { x: 0, y: 0 };
        await roboMouse.moveTo({
            x: viewStore.timeToPxWithOffset(noteToInsert.time),
            y: viewStore.octaveToPxWithOffset(noteToInsert.octave),
        }, generalInterval / timeDiv);
        roboMouse.mousedown();
        await roboMouse.moveTo({
            x: viewStore.timeToPxWithOffset(noteToInsert.timeEnd),
            y: viewStore.octaveToPxWithOffset(noteToInsert.octave),
        }, generalInterval / timeDiv);
        roboMouse.mouseup();
        await wait(generalInterval / timeDiv);
        expect(projectStore.notes.list.length).toBe(1);
        expect(projectStore.notes.list[0].octave).toBeCloseTo(noteToInsert.octave);
    }, generalInterval);

    appCleanup(testRuntime);
});
