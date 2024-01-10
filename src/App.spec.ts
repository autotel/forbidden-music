import { createPinia, setActivePinia } from 'pinia';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import { useProjectStore } from './store/projectStore';
import { useViewStore } from './store/viewStore';
import { note } from './dataTypes/Note';
import { start } from 'repl';
import { useMonoModeInteraction } from './store/monoModeInteraction';
import { disclaimer } from './texts/userDisclaimer';
import { useSelectStore } from './store/selectStore';
import { useSnapStore } from './store/snapStore';

let generalInterval = 500;

const tweener = (
    start: number, end: number, duration: number, callback: (value: number) => void
) => {
    return new Promise((resolve) => {
        if (duration === 0) {
            callback(end);
            resolve(null);
            return;
        }
        const startTime = Date.now();
        const endTime = startTime + duration;
        const range = end - start;
        const step = () => {
            const now = Date.now();
            const value = start + range * ((now - startTime) / duration);
            if (now < endTime) {
                callback(value);
                requestAnimationFrame(step);
            } else {
                callback(end);
                resolve(null);
            }
        };
        step();
    });
}

class RoboMouse {
    currentPosition = { x: 0, y: 0 };
    eventTarget: HTMLElement;
    inTween = false;
    moveTo = (
        to: { x: number, y: number },
        duration: number
    ) => {
        if (this.inTween) throw new Error("already in tween");
        this.inTween = true;
        const from = { ...this.currentPosition }
        const range = {
            x: to.x - from.x,
            y: to.y - from.y
        };

        const tween = tweener(0, 1, duration, (value) => {
            const x = from.x + (range.x * value);
            const y = from.y + (range.y * value);
            Object.assign(this.currentPosition, { x, y });
            this.eventTarget.dispatchEvent(new MouseEvent("mousemove", {
                clientX: x,
                clientY: y,
                bubbles: true,
            }));
        });
        tween.then(() => {
            this.inTween = false;
        })
        return tween;
    }
    mousedown = () => {
        this.eventTarget.dispatchEvent(new MouseEvent("mousedown", {
            clientX: this.currentPosition.x,
            clientY: this.currentPosition.y,
            bubbles: true,
        }));
    }
    mouseup = () => {
        this.eventTarget.dispatchEvent(new MouseEvent("mouseup", {
            clientX: this.currentPosition.x,
            clientY: this.currentPosition.y,
            bubbles: true,
        }));
    }
    constructor(eventTarget: HTMLElement) {
        this.eventTarget = eventTarget;
    }
}

const wait = (time: number) => {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}

describe('app', () => {

    localStorage.clear();

    const document = window.document;
    if (document.body.clientWidth < 800 || document.body.clientHeight < 600) {
        throw new Error("viewport too small");
    }
    const pinia = createPinia();
    setActivePinia(pinia);
    const app = createApp(App).use(pinia)
    const body = document.body;
    const div = document.createElement('div');
    div.style.width = "100vw";
    div.style.height = "100vh";
    div.style.position = "fixed";
    div.style.zIndex = "0";
    div.style.bottom = "0";
    div.style.left = "0";
    // div.style.pointerEvents = "none";
    body.appendChild(div);


    const interactionProtectDiv = document.createElement('div');
    interactionProtectDiv.style.width = "100vw";
    interactionProtectDiv.style.height = "100vh";
    interactionProtectDiv.style.left = "0";
    interactionProtectDiv.style.top = "0";
    interactionProtectDiv.style.position = "fixed";
    interactionProtectDiv.style.zIndex = "10";
    body.appendChild(interactionProtectDiv);


    const roboMouse = new RoboMouse(interactionProtectDiv);

    const project = useProjectStore();
    const view = useViewStore();
    const selection = useSelectStore();
    const snap = useSnapStore();

    let interactionTarget: HTMLElement | null;
    it('mounts', () => {
        const result = app.mount(div)
        console.log(result);

        project.notes.push(note({
            time: 2,
            timeEnd: 4,
            octave: 4,
            layer: 0
        }));
        interactionTarget = div.querySelector("#viewport-selector");
        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;
    })

    it('shows disclaimer', async () => {
        const expectedDisclaimer = disclaimer;
        const disclaimerFound = document.querySelector("#start-disclaimer");
        expect(disclaimerFound).not.toBeNull();
        const disclaimerText = disclaimerFound?.innerHTML;
        expect(disclaimerText).toContain(expectedDisclaimer);
    }, generalInterval)

    it('closes disclaimer', async () => {
        const closeButton = div.querySelector("#start-disclaimer button");
        closeButton?.dispatchEvent(new MouseEvent("click", {
            bubbles: true,
        }));
        roboMouse.mousedown();
        roboMouse.mouseup();
        await wait(10);
        const disclaimerFoundAfterClick = div.querySelector("#start-disclaimer");
        expect(disclaimerFoundAfterClick).toBeNull();
    }, generalInterval)

    it('creates a note by clicking and dragging', async () => {
        const timeDiv = 6;
        const targetNoteDef = {
            time: 2,
            timeEnd: 4,
            octave: 4.5,
            layer: 0
        };

        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;
        roboMouse.currentPosition = { x: 0, y: 0 };
        const startX = view.timeToPxWithOffset(targetNoteDef.time);
        const endX = view.timeToPxWithOffset(targetNoteDef.timeEnd);
        const y = view.octaveToPxWithOffset(targetNoteDef.octave);


        await roboMouse.moveTo({ x: startX, y }, generalInterval / timeDiv);
        await roboMouse.mousedown();
        await roboMouse.moveTo({ x: endX, y }, generalInterval / timeDiv);
        await roboMouse.mouseup();
        await roboMouse.moveTo({ x: 0, y: 0 }, generalInterval / timeDiv);
        await wait(generalInterval / timeDiv);
        expect(project.notes.length).toBe(2);
    }, generalInterval);

    it('selects area', async () => {
        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;
        roboMouse.currentPosition = { x: 0, y: 0 };

        await roboMouse.moveTo({
            x: view.timeToPxWithOffset(1),
            y: view.octaveToPxWithOffset(3),
        }, 100);
        interactionTarget.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Control",
            bubbles: true,
        }));
        await roboMouse.mousedown();
        await roboMouse.moveTo({
            x: view.timeToPxWithOffset(5),
            y: view.octaveToPxWithOffset(5),
        }, generalInterval / 3);
        await roboMouse.mouseup();

        interactionTarget.dispatchEvent(new KeyboardEvent("keyup", {
            key: "Control",
            bubbles: true,
        }));
        await wait(generalInterval / 3);
        expect(selection.getNotes().length).toBe(2);
    }, generalInterval);

    it('duplicates selected ', async () => {
        if (!interactionTarget) throw new Error("interactionTarget is null");
        const div = 4;
        const locationOfOneNote = view.visibleNoteDrawables[0];

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
            x: view.timeToPxWithOffset(0),
            y: locationOfOneNote.x + view.octaveToPx(1),
        }, generalInterval / div);

        interactionTarget.dispatchEvent(new KeyboardEvent("keyup", {
            key: "Alt",
            bubbles: true,
        }));

        await roboMouse.mouseup();
        await wait(generalInterval / div);

        expect(project.notes.length).toBe(4);

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
        expect(project.notes.length).toBe(4);
        expect(selection.getNotes().length).toBe(0);
    }, generalInterval);

    {
        // const generalInterval = 10000;
        it('selects all ', async () => {
            const timeDiv = 4;
            if (!interactionTarget) throw new Error("interactionTarget is null");
            roboMouse.eventTarget = interactionTarget;
            roboMouse.currentPosition = { x: 0, y: 0 };

            await roboMouse.moveTo({
                x: view.timeToPxWithOffset(1),
                y: view.octaveToPxWithOffset(3),
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
            expect(selection.getNotes().length).toBe(4);
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
            expect(project.notes.length).toBe(0);
        },generalInterval);

        it('snaps the created note to octave, if octave snap active', async () => {
            const timeDiv = 4;
            Object.keys(snap.values).forEach(key => {
                snap.values[key].active = false;
            });
            // button with 1EDO text content
            const buttons = document.querySelectorAll("button") 
            let edo1Button = Array.from(buttons).filter((button:HTMLElement) => button.textContent?.match("1EDO"))[0];
            if(!edo1Button) throw new Error("1EDO button not found");
            edo1Button.dispatchEvent(new MouseEvent("click", {
                bubbles: true,
            }));
            expect(snap.values.equal1?.active).toBe(true);
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
                x: view.timeToPxWithOffset(noteToInsert.time),
                y: view.octaveToPxWithOffset(noteToInsert.octave),
            }, generalInterval / timeDiv);
            roboMouse.mousedown();
            await roboMouse.moveTo({
                x: view.timeToPxWithOffset(noteToInsert.timeEnd),
                y: view.octaveToPxWithOffset(noteToInsert.octave),
            }, generalInterval / timeDiv);
            roboMouse.mouseup();
            await wait(generalInterval / timeDiv);
            expect(project.notes.length).toBe(1);
            expect(project.notes[0].octave).toEqual(expectedNote.octave);
        }, generalInterval);

        it('creates a note without snapping if no snap is active', async () => {
            const timeDiv = 4;
            Object.keys(snap.values).forEach(key => {
                snap.values[key].active = false;
            });
            project.notes.length = 0;
            const noteToInsert = {
                time: 0,
                timeEnd: 2,
                octave: 4.1,
                layer: 0
            }
            roboMouse.currentPosition = { x: 0, y: 0 };
            await roboMouse.moveTo({
                x: view.timeToPxWithOffset(noteToInsert.time),
                y: view.octaveToPxWithOffset(noteToInsert.octave),
            }, generalInterval / timeDiv);
            roboMouse.mousedown();
            await roboMouse.moveTo({
                x: view.timeToPxWithOffset(noteToInsert.timeEnd),
                y: view.octaveToPxWithOffset(noteToInsert.octave),
            }, generalInterval / timeDiv);
            roboMouse.mouseup();
            await wait(generalInterval / timeDiv);
            expect(project.notes.length).toBe(1);
            expect(project.notes[0].octave).toBeCloseTo(noteToInsert.octave);
        }, generalInterval);
    }


    afterAll(async () => {
        app.unmount()
        body.removeChild(div);
        body.removeChild(interactionProtectDiv);
        localStorage.clear();

    })




});
