import { useCustomSettingsStore } from '@/store/customSettingsStore';
import { useLoopsStore } from '@/store/loopsStore';
import { useNotesStore } from '@/store/notesStore';
import '@/style.css';
import { createPinia, setActivePinia } from 'pinia';
import { expect } from 'vitest';
import { createApp } from 'vue';
import App from '../App.vue';
import { useProjectStore } from '../store/projectStore';
import { useSelectStore } from '../store/selectStore';
import { useSnapStore } from '../store/snapStore';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
import { disclaimer } from '../texts/userDisclaimer';
import { RoboMouse, wait } from './RoboMouse';
import { TestRuntime } from './testRuntime';
import { beforeAll } from 'vitest';
import { page } from '@vitest/browser/context';


beforeAll(async () => {
  // Access the underlying Playwright page
  const playwright = page as any;
  if (playwright.viewport) {
    await playwright.viewport(1920, 1080);
  }
});


/**
 * Wait until the viewport's coordinate mapping is stable before reading pixel
 * positions. On mount and whenever the surrounding panes re-measure, App.vue's
 * resize() re-runs updateSize(), which changes viewWidthPx and the derived
 * viewWidthTime — and thus timeToPx/octaveToPx. Layout in the browser test
 * environment thrashes briefly (e.g. the #viewport momentarily collapses to a
 * tiny width) around reactive updates such as pushing a note, so a test that
 * computes pixel targets at that instant aims its mouse at the wrong note/time.
 * This polls until the view's tracked width matches the real #viewport element
 * and stays stable for several consecutive samples.
 */
export const waitForStableView = async (
    viewStore: ReturnType<typeof useViewStore>,
    target: HTMLElement | null,
    timeoutMs = 3000,
) => {
    const sample = () => `${viewStore.viewWidthPx}|${viewStore.viewHeightPx}`;
    let stableCount = 0;
    let last = sample();
    const settleStart = Date.now();
    while (Date.now() - settleStart < timeoutMs) {
        await wait(50);
        const current = sample();
        const matchesElement = !target || Math.abs(viewStore.viewWidthPx - target.clientWidth) <= 1;
        if (current === last && matchesElement) {
            if (++stableCount >= 3) break;
        } else {
            stableCount = 0;
            last = current;
        }
    }
};

function promisify<T>(fn: { (ready: (r: T) => void): void; (arg0: any, arg1: (err: any, data: any) => void): void; }) {
  return function() {
    return new Promise<T>((resolve, reject) => {
      fn(resolve);
    })
  };
}

export const appMount = promisify((ready: (r: TestRuntime) => void) => {

    console.log("appMount");
    localStorage.clear();

    const document = window.document;
    // if (document.body.clientWidth < 800 || document.body.clientHeight < 600) {
    //     throw new Error("viewport too small");
    // }
    const pinia = createPinia();
    setActivePinia(pinia);
    const app = createApp(App).use(pinia)
    const body = document.body;
    const containerDiv = document.createElement('div');
    containerDiv.style.width = "100vw";
    containerDiv.style.height = "100vh";
    containerDiv.style.position = "fixed";
    containerDiv.style.zIndex = "8";
    containerDiv.style.bottom = "0";
    containerDiv.style.left = "0";
    body.appendChild(containerDiv);



    const roboMouse = new RoboMouse();

    const projectStore = useProjectStore();
    const viewStore = useViewStore();
    const selectStore = useSelectStore();
    const snapStore = useSnapStore();
    const toolStore = useToolStore();
    const notesStore = useNotesStore();
    const loopsStore = useLoopsStore();
    const userSettingsStore = useCustomSettingsStore();


    let interactionTarget: HTMLElement | null;

    const preRuntime = {
        roboMouse,
        projectStore,
        viewStore,
        toolStore,
        notesStore,
        loopsStore,
        snapStore,
        userSettingsStore,
        pinia,
        app,
        body,
        containerDiv,
        // interactionProtectDiv,
        selectStore,
        didDisclaimerShow: false,
    };

    // console.log(result);
    (async () => {

        const timeout = setTimeout(() => {
            throw new Error("appMount timeout");
        }, 1200);

        // await wait(200);

        app.mount(containerDiv);
        // empty the project preventing default demo project interfering with tests
        projectStore.loadEmptyProjectDefinition();
        selectStore.clear();

        interactionTarget = containerDiv.querySelector("#viewport");
        if (!interactionTarget) throw new Error("interactionTarget is null");
        roboMouse.eventTarget = interactionTarget;

        await wait(200);

        const expectedDisclaimer = disclaimer;
        const disclaimerFound = document.querySelector("#start-disclaimer");
        try {
            if (disclaimerFound === null) {
                console.warn("disclaimer html element not found", document.body.innerHTML);
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
            preRuntime.didDisclaimerShow = true;
        } catch (e) {
            console.error(e);
        }
        clearTimeout(timeout);

        projectStore.loadEmptyProjectDefinition();

        await waitForStableView(viewStore, interactionTarget);
    })().catch((e) => {
        console.error(e);
        ready({} as TestRuntime);
    }).then(() => {
        ready({
            ...preRuntime,
            interactionTarget
        } as TestRuntime);
    });


})