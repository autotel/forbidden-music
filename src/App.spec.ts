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


const tweener = (
    start: number, end: number, duration: number, callback: (value: number) => void
) => {
    return new Promise((resolve) => {
        if(duration === 0){
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
        if(this.inTween) throw new Error("already in tween");
        this.inTween = true;
        const from = {...this.currentPosition}
        const range = {
            x: to.x - from.x,
            y: to.y - from.y
        };
        console.log({ from, to, range });
        const tween = tweener(0, 1, duration, (value) => {
            const x = from.x + (range.x * value);
            const y = from.y + (range.y * value);
            Object.assign(this.currentPosition, { x, y });
            this.eventTarget.dispatchEvent(new MouseEvent("mousemove", {
                clientX: x,
                clientY: y,
                bubbles:true,
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

const waitSeconds = (seconds: number) => {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, seconds * 1000);
    });
}

describe('app', () => {

    localStorage.clear();

    const pinia = createPinia();
    setActivePinia(pinia);
    const app = createApp(App).use(pinia)
    const document = window.document;
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

    let interactionTarget: HTMLElement | null;
    it('mounts', () => {
        const result = app.mount(div)
        console.log(result);

        project.notes.push(note({
            time: 0,
            timeEnd: 1.4,
            octave: 4,
            layer: 0
        }));
        interactionTarget = div.querySelector("#viewport-selector");
        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;
    })
    
    it('shows disclaimer',async ()=>{
        const expectedDisclaimer = disclaimer;
        const disclaimerFound = document.querySelector("#start-disclaimer");
        expect (disclaimerFound).not.toBeNull();
        const disclaimerText = disclaimerFound?.innerHTML;
        expect(disclaimerText).toContain(expectedDisclaimer);
        await waitSeconds(0.3);
    })

    it('closes disclaimer', async () => {
        const closeButton = div.querySelector("#start-disclaimer button");
        closeButton?.dispatchEvent(new MouseEvent("click", {
            bubbles:true,
        }));
        roboMouse.mousedown();
        roboMouse.mouseup();
        await waitSeconds(0.3);
        const disclaimerFoundAfterClick = div.querySelector("#start-disclaimer");
        expect(disclaimerFoundAfterClick).toBeNull();
    })

    it('creates a note by clicking and dragging', async () => {
        const targetNoteDef = {
            time: 2,
            timeEnd: 4,
            octave: 4,
            layer: 0
        };
        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;
        roboMouse.currentPosition = { x: 0, y: 0 };
        const startX = view.timeToPxWithOffset(targetNoteDef.time);
        const endX = view.timeToPxWithOffset(targetNoteDef.timeEnd);
        const y = view.octaveToPxWithOffset(targetNoteDef.octave);

        if (div.clientWidth < endX) throw new Error("endX is outside of the div, enlarge the window");
        if (div.clientWidth < startX) throw new Error("startX is outside of the div, enlarge the window");
        if (div.clientHeight < y) throw new Error("y is outside of the div, enlarge the window");

        console.log({ startX, endX, y });
        await roboMouse.moveTo({ x: startX, y }, 200);
        await roboMouse.mousedown();
        await roboMouse.moveTo({ x: endX, y }, 200);
        await roboMouse.mouseup();
        await roboMouse.moveTo({ x: 0, y: 0 }, 200);
        await waitSeconds(1);
        expect(project.notes.length).toBe(2);
    });

    it('selects area', async () => {
    });

    afterAll(async () => {
        app.unmount()
        body.removeChild(div);
        body.removeChild(interactionProtectDiv);
        localStorage.clear();
    
    })




});
