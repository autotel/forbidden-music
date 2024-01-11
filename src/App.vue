<script setup lang="ts">
import Fraction from 'fraction.js';
import { onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import Button from './components/Button.vue';
import Pianito from './components/Pianito.vue';
import ScoreViewportPixi from './components/ScoreViewport-Pixi/ScoreViewport.vue';
import ScoreViewportSvg from './components/ScoreViewport-Svg/ScoreViewport.vue';
import TimeScrollBar from "./components/TimeScrollBar.vue";
import ToolSelector from './components/ToolSelector.vue';
import TooltipDisplayer from './components/TooltipDisplayer.vue';
import Transport from './components/Transport.vue';
import AnglesLeft from './components/icons/AnglesLeft.vue';
import AnglesRight from './components/icons/AnglesRight.vue';
import { Tool } from './dataTypes/Tool';
import { KeyActions, getActionForKeys } from './keyBindings';
import CustomOctaveTableTextEditor from './modals/CustomOctaveTableTextEditor.vue';
import Modal from './modals/Modal.vue';
import UserDisclaimer from './modals/UserDisclaimer.vue';
import Pane from './pane/Pane.vue';
import { ViewportTech, useCustomSettingsStore } from './store/customSettingsStore';
import { useLibraryStore } from './store/libraryStore';
import { useMonoModeInteraction } from './store/monoModeInteraction';
import { usePlaybackStore } from './store/playbackStore';
import { useProjectStore } from './store/projectStore';
import { useSelectStore } from './store/selectStore';
import { useSnapStore } from './store/snapStore';
import { useToolStore } from './store/toolStore';
import { useHistoryStore } from './store/historyStore';
import { useViewStore } from './store/viewStore';
import { keyBindingsListener } from './functions/keyBindingsListener';

const libraryStore = useLibraryStore();
const monoModeInteraction = useMonoModeInteraction();
const tool = useToolStore();
const view = useViewStore();
const playback = usePlaybackStore();
const project = useProjectStore();
const selection = useSelectStore();
const snap = useSnapStore();
const mouseWidget = ref();
const modalText = ref("");
const clickOutsideCatcher = ref();
const history = useHistoryStore();
const mainInteraction = monoModeInteraction.getInteractionModal("default");
const autosaveTimeout = ref<(ReturnType<typeof setInterval>) | null>(null);
const paneWidth = ref(300);
const viewport = ref<HTMLElement>();
const userSettings = useCustomSettingsStore();

provide('modalText', modalText);


// concerning middle wheel dragging to pan
let draggingView = false;
let viewDragStartX = 0;
let viewDragStartTime = 0;
let viewDragStartY = 0;
let viewDragStartOctave = 0;


const mouseWheelListener = (e: WheelEvent) => {
    const viewMousePositionBefore = {
        time: view.pxToTimeWithOffset(e.clientX),
        octave: -view.pxToOctaveWithOffset(e.clientY),
    }

    // not needed, thanks to applyRatio. Would be needed if zooming independently x and y
    // const wouldViewWidthTime = view.viewWidthTime ** (1 + e.deltaY / 1000);
    const wouldViewHeightOctaves = view.viewHeightOctaves ** (1 + e.deltaY / 1000);

    if (
        // wouldViewWidthTime < 400 && 
        wouldViewHeightOctaves > 0.1
    ) {
        // view.viewWidthTime = wouldViewWidthTime;
        view.viewHeightOctaves = wouldViewHeightOctaves;
    }

    // offset zoom center back 

    const viewMousePositionAfter = {
        time: view.pxToTimeWithOffset(e.clientX),
        octave: -view.pxToOctaveWithOffset(e.clientY),
    }

    view.timeOffset += viewMousePositionBefore.time - viewMousePositionAfter.time;
    view.octaveOffset += viewMousePositionBefore.octave - viewMousePositionAfter.octave;
    view.applyRatioToTime();

    if (view.timeOffset < 0) {
        view.timeOffset = 0;
    }

}

const mouseMoveListener = (e: MouseEvent) => {
    if (mouseWidget.value) {
        // TODO: Use a cursor instead, this is unnecessarily expensive
        mouseWidget.value.style.left = e.clientX + 10 + "px";
        mouseWidget.value.style.top = e.clientY + 10 + "px";
    }
    if (draggingView) {
        // pan view, if dragging middle wheel
        const deltaX = e.clientX - viewDragStartX;
        const deltaY = e.clientY - viewDragStartY;

        view.timeOffset = viewDragStartTime - view.pxToTime(deltaX);
        view.octaveOffset = viewDragStartOctave + view.pxToOctave(deltaY);
        // prevent timeOffset from going out of bounds
        if (view.timeOffset < 0) {
            view.timeOffset = 0;
        }
        if (view.timeOffset > view.scrollBound - view.viewWidthTime) {
            view.timeOffset = view.scrollBound - view.viewWidthTime;
        }
    } else {

        tool.mouseMove(e);
    }
}

const mouseUpListener = (e: MouseEvent) => {
    tool.mouseUp(e);
    // stop panning view, if it were
    draggingView = false;
}
const mouseDownListener = (e: MouseEvent) => {
    // middle wheel
    if (e.button === 1) {
        e.stopPropagation();
        draggingView = true;
        viewDragStartX = e.clientX;
        viewDragStartTime = view.timeOffset;
        viewDragStartY = e.clientY;
        viewDragStartOctave = view.octaveOffset;
    } else {
        // left button
        tool.mouseDown(e);
    }
}

const keyUpListener = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) {
        return;
    }
    const keyAction = getActionForKeys(e.key, e.ctrlKey, e.shiftKey, e.altKey);
    switch (keyAction) {
        case KeyActions.ActivateCopyOnDrag: {
            tool.copyOnDrag = false;
        }
        case KeyActions.ActivateAreaSelectionMode: {
            tool.currentLeftHand = Tool.None;
        }
    }
}

const keyDownListener = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) {
        return;
    }
    keyBindingsListener(e, { selection, tool, playback, view, history, project });
}

const tryLoadStart = async () => {
    try {
        console.log("loading project");
        libraryStore.loadFromLibraryItem(project.name);
    } catch (e) {
        console.log("no default project found", e);
        project.loadEmptyProjectDefinition();
    }
}

onMounted(() => {
    if (clickOutsideCatcher.value) {
        window.addEventListener('wheel', (e) => {
            if (e.target === clickOutsideCatcher.value) {
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        });
    }
    let autosaveCall = () => {
        if (project.name === "unnamed (autosave)") {
            libraryStore.saveCurrent();
        }
    }
    tryLoadStart();
    if (autosaveTimeout.value) clearInterval(autosaveTimeout.value);
    autosaveTimeout.value = setInterval(autosaveCall, 1000);

    mainInteraction.addEventListener(window, 'keydown', keyDownListener);
    mainInteraction.addEventListener(window, 'keyup', keyUpListener);

    const $viewPort = viewport.value;
    if (!$viewPort?.addEventListener) throw new Error("viewport not found");

    mainInteraction.addEventListener($viewPort, 'mousedown', mouseDownListener);
    mainInteraction.addEventListener(window, 'mouseup', mouseUpListener);
    mainInteraction.addEventListener($viewPort, 'mousemove', mouseMoveListener);
    mainInteraction.addEventListener($viewPort, 'wheel', mouseWheelListener);
    mainInteraction.addEventListener($viewPort, 'mouseleave' as any, () => {
        snap.resetSnapExplanation();
    });
    window.addEventListener('resize', resize);
    resize();

})
onBeforeUnmount(() => {
    if (autosaveTimeout.value) clearInterval(autosaveTimeout.value);
    libraryStore.clear();
    window.removeEventListener('mouseup', mouseUpListener);
    mainInteraction.removeAllEventListeners();
});

const resize = () => {
    viewportSize.value = {
        width: window.innerWidth - paneWidth.value,
        height: window.innerHeight - 50,
    };
    view.updateSize(viewportSize.value.width, viewportSize.value.height);
};

const viewportSize = ref({ width: 0, height: 0 });

watch(paneWidth, () => {
    resize();
})
</script>
<template>
    <div id="app-container" oncontextmenu="return false;">
        <div id="viewport" ref="viewport"
            :style="{ position: 'absolute', width: viewportSize.width + 'px', height: viewportSize.height + 'px' }">
            <ScoreViewportPixi v-if="userSettings.viewportTech === ViewportTech.Pixi" :width="viewportSize.width"
                :height="viewportSize.height" />
            <ScoreViewportSvg v-else-if="userSettings.viewportTech === ViewportTech.Svg" :width="viewportSize.width"
                :height="viewportSize.height" />
        </div>
        <TimeScrollBar />
        <div style="position: absolute; top: 0; left: 0;pointer-events: none;" ref="mouseWidget">
            {{ tool.currentMouseStringHelper }}
        </div>
        <div style="position:absolute; right:0px; top:30px">
            <Pane :paneWidth="paneWidth" />
            <Button :onClick="() => paneWidth = paneWidth ? 0 : 300" style="position:absolute"
                :style="{ right: paneWidth + 'px' }">

                <AnglesRight v-if="paneWidth" />
                <AnglesLeft v-else />
            </Button>
        </div>
        <Pianito v-if="tool.showReferenceKeyboard" />
        <div class="toolbars-container">
            <Transport />
            <!-- <Autotel /> -->
            <ToolSelector />
        </div>
    </div>
    <Modal name="credits modal" :onClose="() => modalText = ''">
        <pre>{{ (modalText) }}</pre>
    </Modal>
    <Modal name="octave table editor">
        <CustomOctaveTableTextEditor />
    </Modal>
    <Modal name="relation fraction editor">
        <div class="form-row">
            <label>Simplicity: &nbsp;</label>
            <input type="number" v-model="snap.simplify" step="0.01" min="0" max="1" />
            <Button :onClick="() => snap.simplify = 0.12">default</Button>
        </div>
        <div>
            <p>A higher simplicity will allow less complex fractions.</p>
            <p> examples: </p>
            <ul>
                <li v-for="fr in [
                            1 / 2,
                            2 / 3,
                            3 / 4,
                            4 / 5,
                            5 / 6,
                            6 / 7,
                            7 / 8,
                            8 / 9,
                            9 / 10
                        ]">
                    {{ new Fraction(fr).toFraction() }} is rounded to {{
                        new Fraction(fr).simplify(snap.simplify).toFraction()
                    }}
                </li>
            </ul>
        </div>
    </Modal>
    <UserDisclaimer />

    <TooltipDisplayer />
</template>
<style>
.padded {
    margin-left: 1em;
    margin-right: 1em;
}

.form-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 1em;
}

.form-section {
    margin: 1em;
    font-weight: 600;
}

.form-row.disabled {
    opacity: 0.5;
    pointer-events: none;
}

.full-width {
    width: 100%;
    box-sizing: border-box;
}

#viewport {
    user-select: none;
}
</style>
<style scoped>
.unclickable {
    pointer-events: none;
}

.toolbars-container {
    position: fixed;
    bottom: 0px;
    left: 0px;
    width: 100vw;
    display: flex;
    justify-content: space-between;
    align-items: end;
    height: 2.8em;
}
</style>
