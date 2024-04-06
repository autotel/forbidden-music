import { afterAll, describe, expect, it } from 'vitest';
import { note } from './dataTypes/Note';
import { Tool } from './dataTypes/Tool';
import './style.css';
import { appMount } from './test-helpers/appSetup';
import { wait } from './test-helpers/RoboMouse';
import { appCleanup } from './test-helpers/appCleanup';
let generalInterval = 500;


describe('robomouse', async () => {

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
    
    it('selects by hovering and clicking', async () => {
        if(projectStore.notes.length < 1) {
            throw new Error("This test needs a one note to exist");
        }
        const noteToDrag = projectStore.notes[0];
        
        const noteBox = viewStore.rectOfNote(noteToDrag);
        const start = {
            x: noteBox.x + noteBox.radius,
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
        await wait(1000);
    });

    appCleanup(testRuntime);
});
