import { afterAll, describe, expect, it, test } from 'vitest';
import { note } from './dataTypes/Note';
import { Tool } from './dataTypes/Tool';
import '@/style.css';
import { appMount } from './test-helpers/appSetup';
import { wait } from './test-helpers/RoboMouse';
import { appCleanup } from './test-helpers/appCleanup';
let generalInterval = 500;


describe('app modulation mode', async () => {

    const testRuntime = await appMount();


    it('enters modulation tool', async () => {
        if (!interactionTarget) throw new Error("interactionTarget is null");
        interactionTarget.dispatchEvent(new KeyboardEvent("keydown", {
            key: "m",
            bubbles: true,
        }));
        expect(toolStore.current).toBe(Tool.Modulation);
    }, generalInterval);

    it('selects notes by area while on modulation tool', async () => {
        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;
        roboMouse.currentPosition = { x: 0, y: 0 };

        await roboMouse.moveTo({
            x: viewStore.timeToPxWithOffset(1),
            y: viewStore.octaveToPxWithOffset(3),
        }, 100);
        interactionTarget.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Control",
            bubbles: true,
        }));
        await roboMouse.mousedown();
        await roboMouse.moveTo({
            x: viewStore.timeToPxWithOffset(5),
            y: viewStore.octaveToPxWithOffset(5),
        }, generalInterval / 3);
        await roboMouse.mouseup();

        interactionTarget.dispatchEvent(new KeyboardEvent("keyup", {
            key: "Control",
            bubbles: true,
        }));
        await wait(generalInterval / 3);
        const existingNotes = testRuntime.notesStore.list.length;
        expect(selectStore.getNotes().length).toBe(existingNotes);

        selectStore.select();
    }, generalInterval);
    it('exits modulation tool', async () => {
        if (!interactionTarget) throw new Error("interactionTarget is null");
        interactionTarget.dispatchEvent(new KeyboardEvent("keyup", {
            key: "m",
            bubbles: true,
        }));
        expect(toolStore.current).not.toBe(Tool.Select);
    });

    
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
    

    appCleanup(testRuntime);
});
