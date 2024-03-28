import { createPinia, setActivePinia } from 'pinia';
import { promisify } from 'util';
import { expect, it } from 'vitest';
import { createApp } from 'vue';
import { note } from '../dataTypes/Note';
import App from '../src/App.vue';
import '../src/style.css';
import { useProjectStore } from '../store/projectStore';
import { useSelectStore } from '../store/selectStore';
import { useSnapStore } from '../store/snapStore';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
import { disclaimer } from '../texts/userDisclaimer';
import { TestRuntime } from './testRuntime';
import { RoboMouse, wait } from './utils';
export const appMount = promisify((ready: (err: any, r: TestRuntime) => void) => {



    localStorage.clear();

    const document = window.document;
    if (document.body.clientWidth < 800 || document.body.clientHeight < 600) {
        throw new Error("viewport too small");
    }
    const pinia = createPinia();
    setActivePinia(pinia);
    const app = createApp(App).use(pinia)
    const body = document.body;
    const containerDiv = document.createElement('div');
    containerDiv.style.width = "100vw";
    containerDiv.style.height = "100vh";
    containerDiv.style.position = "fixed";
    containerDiv.style.zIndex = "0";
    containerDiv.style.bottom = "0";
    containerDiv.style.left = "0";
    // div.style.pointerEvents = "none";
    body.appendChild(containerDiv);


    const interactionProtectDiv = document.createElement('div');
    interactionProtectDiv.style.width = "100vw";
    interactionProtectDiv.style.height = "100vh";
    interactionProtectDiv.style.left = "0";
    interactionProtectDiv.style.top = "0";
    interactionProtectDiv.style.position = "fixed";
    interactionProtectDiv.style.zIndex = "10";
    body.appendChild(interactionProtectDiv);


    const roboMouse = new RoboMouse(interactionProtectDiv);

    const projectStore = useProjectStore();
    const viewStore = useViewStore();
    const selectStore = useSelectStore();
    const snapStore = useSnapStore();
    const toolStore = useToolStore();

    let interactionTarget: HTMLElement | null;

    const preRuntime = {
        roboMouse,
        projectStore,
        viewStore,
        toolStore,
        snapStore,
        pinia,
        app,
        body,
        containerDiv,
        interactionProtectDiv,
        selectStore,
    }



    it('mounts', () => {
        const result = app.mount(containerDiv)
        console.log(result);
        // empty the project preventing default demo project interfering with tests
        projectStore.loadEmptyProjectDefinition();
        projectStore.notes.push(note({
            time: 2,
            timeEnd: 4,
            octave: 4,
            layer: 0
        }));
        interactionTarget = containerDiv.querySelector("#viewport");
        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;

    })

    it('shows disclaimer', async () => {
        const expectedDisclaimer = disclaimer;
        const disclaimerFound = document.querySelector("#start-disclaimer");
        expect(disclaimerFound).not.toBeNull();
        const disclaimerText = disclaimerFound?.innerHTML;
        expect(disclaimerText).toContain(expectedDisclaimer);
    })

    it('closes disclaimer', async () => {
        const closeButton = containerDiv.querySelector("#start-disclaimer button");
        closeButton?.dispatchEvent(new MouseEvent("click", {
            bubbles: true,
        }));
        roboMouse.mousedown();
        roboMouse.mouseup();
        await wait(10);
        const disclaimerFoundAfterClick = containerDiv.querySelector("#start-disclaimer");
        expect(disclaimerFoundAfterClick).toBeNull();

        if(interactionTarget === null){
            throw new Error("interactionTarget is null");
        }
        
        ready(null, {
            ...preRuntime,
            interactionTarget
        } as TestRuntime);
    })


})