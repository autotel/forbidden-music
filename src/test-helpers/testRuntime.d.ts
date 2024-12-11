import { App } from "vue";
import { useProjectStore } from "../store/projectStore";
import { useSnapStore } from "../store/snapStore";
import { useToolStore } from "../store/toolStore";
import { useViewStore } from "../store/viewStore";
import { useLoopsStore } from "../store/loopsStore";
import { RoboMouse } from "./utils";
import { Pinia } from "pinia";
import { useSelectStore } from "../store/selectStore";
import { useNotesStore } from "@/store/notesStore";

export interface TestRuntime {
    roboMouse: RoboMouse;
    projectStore: ReturnType<typeof useProjectStore>;
    viewStore: ReturnType<typeof useViewStore>;
    toolStore: ReturnType<typeof useToolStore>;
    snapStore: ReturnType<typeof useSnapStore>;
    loopsStore: ReturnType<typeof useLoopsStore>;
    notesStore: ReturnType<typeof useNotesStore>;
    containerDiv: HTMLDivElement;
    selectStore: ReturnType<typeof useSelectStore>;
    interactionTarget: HTMLElement;
    body: HTMLElement;
    app: App;
    pinia: Pinia;
    didDisclaimerShow: boolean;
}