import { afterAll, describe, expect, it } from 'vitest';
import { note } from './dataTypes/Note';
import { Tool } from './dataTypes/Tool';
import './style.css';
import { appMount } from './test-helpers/appSetup';
import { wait } from './test-helpers/RoboMouse';
import { appCleanup } from './test-helpers/appCleanup';
import { MouseDownActions } from './store/toolStore';
import { magicLoopDuplicator } from './components/ScoreViewport-Svg/LoopRangeElement.vue';

let generalInterval = 5000;


describe('app loop editing', async () => {

    const testRuntime = await appMount();
    const {
        interactionTarget,
        roboMouse,
        viewStore,
        projectStore,
        toolStore,
        loopsStore,
        notesStore,
    } = testRuntime;

    const resetNotes = () => {
        notesStore.clear();
        notesStore.append(note({
            time: 2,
            timeEnd: 4,
            octave: 4,
            layer: 0
        }),note({
            time: 3,
            timeEnd: 5,
            octave: 4.6,
            layer: 0
        }));
    }

    resetNotes();
    
    it('creates a loop by clicking and dragging', async () => {
        const interval = 50;
        const targetLoopDef = {
            time: 2,
            timeEnd: 4,
        };

        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;
        roboMouse.currentPosition = { x: 0, y: 0 };

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
        
        expect (toolStore.current).toBe(Tool.Loop);

        const startX = viewStore.timeToPxWithOffset(targetLoopDef.time);
        const endX = viewStore.timeToPxWithOffset(targetLoopDef.timeEnd);
        const y = 100;


        await roboMouse.moveTo({ x: startX, y }, interval);
        await roboMouse.mousedown();
        await roboMouse.moveTo({ x: endX, y }, interval);
        await roboMouse.mouseup();
        await roboMouse.moveTo({ x: 0, y: 0 }, interval);
        await wait(interval * 2);

        expect(loopsStore.list.length).toBe(1);

        loopsStore.clear();
        toolStore.current = Tool.Select;
        
    }, generalInterval);
    
    it('creates the loop at the correct time', async () => {
        const interval = 50;
        const targetLoopDef = {
            time: 2,
            timeEnd: 4,
        };
        
        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;
        roboMouse.currentPosition = { x: 0, y: 0 };

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
        
        expect (toolStore.current).toBe(Tool.Loop);

        const startX = viewStore.timeToPxWithOffset(targetLoopDef.time);
        const endX = viewStore.timeToPxWithOffset(targetLoopDef.timeEnd);
        const y = 100;


        await roboMouse.moveTo({ x: startX, y }, interval);
        await roboMouse.mousedown();
        await roboMouse.moveTo({ x: endX, y }, interval);
        await roboMouse.mouseup();
        await roboMouse.moveTo({ x: 0, y: 0 }, interval);
        await wait(interval * 2);

        expect(loopsStore.list[0].time).toBe(targetLoopDef.time);
        expect(loopsStore.list[0].timeEnd).toBe(targetLoopDef.timeEnd);

        loopsStore.list = [];
        toolStore.current = Tool.Select;
    });
    it('can duplicate loops & their content', async () => {

        const interval = 50;
        const targetLoopDef = {
            time: 2,
            timeEnd: 4,
        };
        
        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;
        roboMouse.currentPosition = { x: 0, y: 0 };

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
        
        expect (toolStore.current).toBe(Tool.Loop);

        const startX = viewStore.timeToPxWithOffset(targetLoopDef.time);
        const endX = viewStore.timeToPxWithOffset(targetLoopDef.timeEnd);
        const y = 100;


        await roboMouse.moveTo({ x: startX, y }, interval);
        await roboMouse.mousedown();
        await roboMouse.moveTo({ x: endX, y }, interval);
        await roboMouse.mouseup();
        await roboMouse.moveTo({ x: 0, y: 0 }, interval);
        await wait(interval * 2);

        magicLoopDuplicator(loopsStore.list[0]);
        
        await roboMouse.moveTo({ x: startX, y }, interval);

        expect(loopsStore.list.length).toBe(2);
        expect(notesStore.list.length).toBe(4);

        loopsStore.list = [];
        toolStore.current = Tool.Select;
        // note: Not resetting notes for next test
    });

    it('notes on duplicated loop  & after end up at the expected positions', async () => {
        const interval = 50;
        const targetLoopDef = {
            time: 2,
            timeEnd: 4,
        };
        
        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;
        roboMouse.currentPosition = { x: 0, y: 0 };

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
        
        expect (toolStore.current).toBe(Tool.Loop);

        const startX = viewStore.timeToPxWithOffset(targetLoopDef.time);
        const endX = viewStore.timeToPxWithOffset(targetLoopDef.timeEnd);
        const y = 100;
        const expectedTimeIncrease = targetLoopDef.timeEnd - targetLoopDef.time;


        await roboMouse.moveTo({ x: startX, y }, interval);
        await roboMouse.mousedown();
        await roboMouse.moveTo({ x: endX, y }, interval);
        await roboMouse.mouseup();
        await roboMouse.moveTo({ x: 0, y: 0 }, interval);

        await wait(interval * 2);


        let notesSorted = notesStore.list.sort((a, b) => a.time - b.time).map(note);
        const originalNotes = notesSorted.slice(0, 2);


        magicLoopDuplicator(loopsStore.list[0]);
        
        await roboMouse.moveTo({ x: startX, y }, interval);

        expect(loopsStore.list.length).toBe(2);
        expect(notesStore.list.length).toBe(6);
        expect(loopsStore.list[0].time).toBe(targetLoopDef.time);
        expect(loopsStore.list[0].timeEnd).toBe(targetLoopDef.timeEnd);

        notesSorted = notesStore.list.sort((a, b) => a.time - b.time);

        expect(notesSorted[0].time).toBe(originalNotes[0].time);
        expect(notesSorted[1].time).toBe(originalNotes[1].time);
        expect(notesSorted[2].time).toBe(originalNotes[0].time + expectedTimeIncrease);
        expect(notesSorted[3].time).toBe(originalNotes[1].time + expectedTimeIncrease);
        expect(notesSorted[4].time).toBe(originalNotes[0].time + expectedTimeIncrease * 2);
        expect(notesSorted[5].time).toBe(originalNotes[1].time + expectedTimeIncrease * 2);

        loopsStore.list = [];
        toolStore.current = Tool.Select;
        resetNotes();
    });

    it('does not grab notes ending at the beggining of loop', async () => {
        const interval = 500;

        const expectedTimeIncrease = 2;

        const targetLoopDef = {
            time: notesStore.list[0].timeEnd,
            timeEnd: notesStore.list[0].timeEnd + expectedTimeIncrease,
        };
        
        if (!interactionTarget) throw new Error("interactionTarget is null");

        roboMouse.eventTarget = interactionTarget;
        roboMouse.currentPosition = { x: 0, y: 0 };

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
        
        expect (toolStore.current).toBe(Tool.Loop);

        const startX = viewStore.timeToPxWithOffset(targetLoopDef.time);
        const endX = viewStore.timeToPxWithOffset(targetLoopDef.timeEnd);
        const y = 100;


        await roboMouse.moveTo({ x: startX, y }, interval);
        await roboMouse.mousedown();
        await roboMouse.moveTo({ x: endX, y }, interval);
        await roboMouse.mouseup();
        await roboMouse.moveTo({ x: 0, y: 0 }, interval);

        await wait(interval * 2);

        let notesSorted = notesStore.list.sort((a, b) => a.time - b.time).map(note);
        const originalNotes = notesSorted.slice(0, 2);

        magicLoopDuplicator(loopsStore.list[0]);
        
        await roboMouse.moveTo({ x: startX, y }, interval);

        expect(loopsStore.list.length).toBe(2);
        expect(notesStore.list.length).toBe(2);
        
        notesSorted = notesStore.list.sort((a, b) => a.time - b.time);

        expect(notesSorted[0].time).toBe(originalNotes[0].time);
        expect(notesSorted[1].time).toBe(originalNotes[1].time);

        loopsStore.list = [];
        toolStore.current = Tool.Select;
        resetNotes();
    });

    appCleanup(testRuntime);
});
