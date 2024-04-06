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

        projectStore.notes.push(note({
            time: 2,
            timeEnd: 4,
            octave: 4,
            layer: 0
        }));

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

        await wait(100);
        
        if(projectStore.notes.length !== 1) {
            throw new Error("Failed to insert note during test");
        }

        const noteToDrag = projectStore.notes[0];
        
        if(noteToDrag.time !== noteToInsert.time) {
            throw new Error("Inserted note's time does not match expected time");
        }
        if(noteToDrag.octave !== noteToInsert.octave) {
            throw new Error("Inserted note's octave does not match expected octave");
        }
        
        // toolStore.disallowOctaveChange = true;
        
        // const noteBox = viewStore.locationOfTrace(noteToDrag);
        const noteBox = viewStore.rectOfNote(noteToDrag);
        const start = {
            x: (noteBox.x + viewStore.timeToPx(noteBox.event.timeEnd)) / 2,
            y: noteBox.y + noteBox.radius,
        }
        const end = {
            x: viewStore.timeToPxWithOffset(noteToDrag.time + 1),
            y: viewStore.octaveToPxWithOffset(noteToDrag.octave + 1),
        }
        
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Control" }));
        roboMouse.mousedown();
        await wait(100);
        await roboMouse.moveTo(start, 700);
        await wait(100);
        roboMouse.mouseup();
        await wait(100);
        document.dispatchEvent(new KeyboardEvent("keyup", { key: "Control" }));
        if(selectStore.getNotes().length === 0) {
            throw new Error("Failed to select notes for drag during test");
        }
        await roboMouse.moveTo(end, generalInterval / timeDiv);
        roboMouse.mouseup();
        await wait(generalInterval / timeDiv);
        expect(projectStore.notes[0].octave).toEqual(noteToInsert.octave);
    });

    appCleanup(testRuntime);
});
