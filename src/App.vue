<script setup lang="ts">
import Fraction from 'fraction.js';
import { onBeforeMount, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import Button from './components/Button.vue';
import Pianito from './components/Pianito.vue';
import ScoreViewportPixi from './components/ScoreViewport-Pixi/ScoreViewport.vue';
import ScoreViewportSvg from './components/ScoreViewport-Svg/ScoreViewport.vue';
import SkipBar from './components/SkipBar.vue';
import TimeScrollBar from "./components/TimeScrollBar.vue";
import ToolSelector from './components/ToolSelector.vue';
import TooltipDisplayer from './components/TooltipDisplayer.vue';
import Transport from './components/Transport.vue';
import AnglesLeft from './components/icons/AnglesLeft.vue';
import AnglesRight from './components/icons/AnglesRight.vue';
import { Tool } from './dataTypes/Tool';
import { keyBindingsListener } from './functions/keyBindingsListener';
import { KeyActions, getActionForKeys } from './keyBindings';
import CustomOctaveTableTextEditor from './modals/CustomOctaveTableTextEditor.vue';
import Modal from './modals/Modal.vue';
import UserDisclaimer from './modals/UserDisclaimer.vue';
import Harp from './overlays/Harp.vue';
import RightPane from './right-pane/RightPane.vue';
import { ViewportTech, useCustomSettingsStore } from './store/customSettingsStore';
import { useHistoryStore } from './store/historyStore';
import { useLibraryStore } from './store/libraryStore';
import { useMonoModeInteraction } from './store/monoModeInteraction';
import onePerRuntimeStore from './store/onePerRuntimeStore';
import { usePlaybackStore } from './store/playbackStore';
import { useProjectStore } from './store/projectStore';
import { useSelectStore } from './store/selectStore';
import { useSnapStore } from './store/snapStore';
import { useToolStore } from './store/toolStore';
import { useViewStore } from './store/viewStore';
import AnglesUp from './components/icons/AnglesUp.vue';
import AnglesDown from './components/icons/AnglesDown.vue';
import BottomPane from './bottom-pane/BottomPane.vue';
import { useExclusiveContentsStore } from './store/exclusiveContentsStore';

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
const sidePaneWidth = ref(300);
const bottomPaneHeight = ref(300);
const viewport = ref<HTMLElement>();
const userSettings = useCustomSettingsStore();
const exclusiveContentsStore = useExclusiveContentsStore();
let transportHeight = 50;

provide('modalText', modalText);


// concerning middle wheel dragging to pan
let draggingView = false;
let viewDragStartX = 0;
let viewDragStartTime = 0;
let viewDragStartY = 0;
let viewDragStartOctave = 0;


const mouseWheelListener = (e: WheelEvent) => {
    e.preventDefault();
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
        e.preventDefault();
        draggingView = true;
        viewDragStartX = e.clientX;
        viewDragStartTime = view.timeOffset;
        viewDragStartY = e.clientY;
        viewDragStartOctave = view.octaveOffset;
    } else if (e.button === 2) {
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
        console.log("loading project " + project.name);
        libraryStore.loadFromLibraryItem(project.name);
    } catch (e) {
        console.log("problem loading default project:", e);
        // project.loadEmptyProjectDefinition();
        project.loadDemoProjectDefinition();
    }
}

onMounted(() => {
    exclusiveContentsStore.evaluateFromUrl();
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
    transportHeight = document.querySelector('.toolbars-container')?.clientHeight || 50;
    viewportSize.value = {
        width: window.innerWidth - sidePaneWidth.value,
        height: window.innerHeight - transportHeight - bottomPaneHeight.value,
    };
    view.updateSize(viewportSize.value.width, viewportSize.value.height);
};

const viewportSize = ref({ width: 0, height: 0 });

watch([sidePaneWidth, bottomPaneHeight], () => {
    resize();
})

const allowContextMenu = true;

</script>
<template>
    <div id="app-container" oncontextmenu="return allowContextMenu">
        <div id="viewport" ref="viewport"
            :style="{ position: 'absolute', width: viewportSize.width + 'px', height: viewportSize.height + 'px' }">
            <ScoreViewportPixi v-if="userSettings.viewportTech === ViewportTech.Pixi" :width="viewportSize.width"
                :height="viewportSize.height" />
            <ScoreViewportSvg v-else-if="userSettings.viewportTech === ViewportTech.Svg" :width="viewportSize.width"
                :height="viewportSize.height" />
            <TimeScrollBar style="position:absolute; left:0; bottom:0;" />
        </div>
        <div style="position: absolute; top: 0; left: 0;pointer-events: none;" ref="mouseWidget">
            {{ tool.currentMouseStringHelper }}
        </div>
        <div style="position:absolute; right:0px; top:30px">
            <RightPane :paneWidth="sidePaneWidth" />
            <Button :onClick="() => sidePaneWidth = sidePaneWidth ? 0 : 300" style="position:absolute"
                :style="{ right: sidePaneWidth + 'px' }">

                <AnglesRight v-if="sidePaneWidth" />
                <AnglesLeft v-else />
            </Button>
        </div>
        <div :style="{
            position: 'absolute',
            bottom: `${transportHeight}px`,
            left: '0px',
            height: `${bottomPaneHeight}px`
        }">
            <BottomPane :paneHeight="bottomPaneHeight" />
        </div>
        <Pianito v-if="tool.showReferenceKeyboard" />
        <div class="toolbars-container bg-colored">
            <Transport />
            <div style="display:flex; align-items: center; height: 100%;">
                <Button :onClick="() => bottomPaneHeight = bottomPaneHeight ? 0 : 300">
                    <AnglesDown v-if="bottomPaneHeight" />
                    <AnglesUp v-else />
                    Synth
                </Button>
            </div>
            <!-- <Autotel /> -->
            <ToolSelector />
            <SkipBar />
        </div>

        <div style="position:absolute; left:0px; top:0">
            <template v-if="userSettings.showHarp">
                <Harp />
            </template>
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
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
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
