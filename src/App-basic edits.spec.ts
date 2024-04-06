import { afterAll, describe, expect, it } from 'vitest';
import { note } from './dataTypes/Note';
import { Tool } from './dataTypes/Tool';
import './style.css';
import { appMount } from './test-helpers/appSetup';
import { wait } from './test-helpers/RoboMouse';
import { appCleanup } from './test-helpers/appCleanup';
let generalInterval = 500;


describe('app basic editing tools', async () => {

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


    projectStore.notes.push(note({
        time: 2,
        timeEnd: 4,
        octave: 4,
        layer: 0
    }));
    
    it('creates a note by clicking and dragging', async () => {
        const timeDiv = 7;
        const targetNoteDef = {
            time: 2,
            timeEnd: 4,
            octave: 4.5,
            layer: 0
        };

        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;
        roboMouse.currentPosition = { x: 0, y: 0 };
        const startX = viewStore.timeToPxWithOffset(targetNoteDef.time);
        const endX = viewStore.timeToPxWithOffset(targetNoteDef.timeEnd);
        const y = viewStore.octaveToPxWithOffset(targetNoteDef.octave);


        await roboMouse.moveTo({ x: startX, y }, generalInterval / timeDiv);
        await roboMouse.mousedown();
        await roboMouse.moveTo({ x: endX, y }, generalInterval / timeDiv);
        await roboMouse.mouseup();
        await roboMouse.moveTo({ x: 0, y: 0 }, generalInterval / timeDiv);
        await wait(generalInterval / timeDiv);
        expect(projectStore.notes.length).toBe(2);
    }, generalInterval);
  
    it('selects by hovering and clicking', async () => {
        if(projectStore.notes.length < 1) {
            throw new Error("This test needs a one note to exist");
        }
        const noteToDrag = projectStore.notes[0];
        
        const noteBox = viewStore.rectOfNote(noteToDrag);
        const start = {
            x: (noteBox.x + viewStore.timeToPx(noteBox.event.timeEnd)) / 2,
            y: noteBox.y + noteBox.radius,
        }

        await roboMouse.moveTo(start, 700);
        await wait(100);
        roboMouse.mousedown();
        await wait(100);
        roboMouse.mouseup();
        await roboMouse.moveTo({x:0,y:0}, 700);
        expect(selectStore.getNotes().length).toBeGreaterThan(0)
        selectStore.select();
        if(selectStore.getNotes().length > 0) {
            throw new Error("Failed to reset selection");
        }
    });

    it('selects area', async () => {
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
        expect(selectStore.getNotes().length).toBe(2);
    }, generalInterval);

    it('duplicates selected ', async () => {
        if (!interactionTarget) throw new Error("interactionTarget is null");
        const div = 4;
        const locationOfOneNote = viewStore.visibleNoteDrawables[0];

        await roboMouse.moveTo({
            x: locationOfOneNote.x + locationOfOneNote.radius,
            y: locationOfOneNote.y + locationOfOneNote.radius,
        }, generalInterval / div);

        interactionTarget.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Alt",
            bubbles: true,
        }));

        await roboMouse.mousedown();

        await roboMouse.moveTo({
            x: viewStore.timeToPxWithOffset(0),
            y: locationOfOneNote.x + viewStore.octaveToPx(1),
        }, generalInterval / div);

        interactionTarget.dispatchEvent(new KeyboardEvent("keyup", {
            key: "Alt",
            bubbles: true,
        }));

        await roboMouse.mouseup();
        await wait(generalInterval / div);

        expect(projectStore.notes.length).toBe(4);

    }, generalInterval);

    it('deselects', async () => {
        await roboMouse.moveTo({
            x: 0,
            y: 0,
        }, 100);
        if (!interactionTarget) throw new Error("interactionTarget is null");
        interactionTarget.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Control",
            bubbles: true,
        }));
        roboMouse.mousedown();
        roboMouse.mouseup();
        interactionTarget.dispatchEvent(new KeyboardEvent("keyup", {
            key: "Control",
            bubbles: true,
        }));
        expect(projectStore.notes.length).toBe(4);
        expect(selectStore.getNotes().length).toBe(0);
    }, generalInterval);

    // const generalInterval = 10000;
    it('selects all ', async () => {
        const timeDiv = 4;
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
        interactionTarget.dispatchEvent(new KeyboardEvent("keydown", {
            key: "a",
            ctrlKey: true,
            bubbles: true,
        }));
        interactionTarget.dispatchEvent(new KeyboardEvent("keyup", {
            key: "Control",
            bubbles: true,
        }));
        interactionTarget.dispatchEvent(new KeyboardEvent("keyup", {
            key: "a",
            bubbles: true,
        }));
        await wait(generalInterval / timeDiv);
        expect(selectStore.getNotes().length).toBe(4);
    }, generalInterval);

    it('deletes selected ', async () => {
        if (!interactionTarget) throw new Error("interactionTarget is null");
        const timeDiv = 2;
        interactionTarget.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Delete",
            bubbles: true,
        }));
        interactionTarget.dispatchEvent(new KeyboardEvent("keyup", {
            key: "Delete",
            bubbles: true,
        }));
        await wait(generalInterval / timeDiv);
        expect(projectStore.notes.length).toBe(0);
    }, generalInterval);


    appCleanup(testRuntime);
});
