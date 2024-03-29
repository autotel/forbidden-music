import { createPinia, setActivePinia } from 'pinia';
import { promisify } from 'util';
import { expect, it } from 'vitest';
import { createApp } from 'vue';
import App from '../App.vue';
import { note } from '../dataTypes/Note';
import { useProjectStore } from '../store/projectStore';
import { useSelectStore } from '../store/selectStore';
import { useSnapStore } from '../store/snapStore';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
import '../style.css';
import { disclaimer } from '../texts/userDisclaimer';
import { TestRuntime } from './testRuntime';
import { RoboMouse, wait } from './utils';
export const appMount = promisify((ready: (err: any, r: TestRuntime) => void) => {

    console.log("appMount");
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
    };
    
    // console.log(result);
    (async () => {
        
        const timeout = setTimeout(() => {
            throw new Error("appMount timeout");
        },1200);
        
        // await wait(200);

        const result = app.mount(containerDiv);
        // empty the project preventing default demo project interfering with tests
        projectStore.loadEmptyProjectDefinition();
        

        interactionTarget = containerDiv.querySelector("#viewport");
        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;
        
        await wait(200);
        
        const expectedDisclaimer = disclaimer;
        const disclaimerFound = document.querySelector("#start-disclaimer");
        if(disclaimerFound === null) {
            console.log(document.body.innerHTML);
            throw new Error("disclaimer html element not found");
        }
        const disclaimerText = disclaimerFound?.innerHTML;
        expect(disclaimerText).toContain(expectedDisclaimer);
        const closeButton = document.querySelector("#start-disclaimer button");
        closeButton?.dispatchEvent(new MouseEvent("click", {
            bubbles: true,
        }));
        roboMouse.click();
        await wait(10);
        const disclaimerFoundAfterClick = document.querySelector("#start-disclaimer");
        expect(disclaimerFoundAfterClick).toBeNull();

        clearTimeout(timeout);
        
    })().catch((e) => {
        console.error(e);
        ready(e, {} as TestRuntime);
    }).then(() => {
        ready(null, {
            ...preRuntime,
            interactionTarget
        } as TestRuntime);
    });


})