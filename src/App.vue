<script setup lang="ts">
import WorkletWorkbench from '@/WorkletWorkbench.vue';
import Fraction from 'fraction.js';
import { onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import BottomPane from './bottom-pane/BottomPane.vue';
import Button from './components/Button.vue';
import FtView from './components/FtView.vue';
import AnglesLeft from './components/icons/AnglesLeft.vue';
import AnglesRight from './components/icons/AnglesRight.vue';
import MousePopupDisplayer from './components/MousePopupDisplayer.vue';
import Pianito from './components/Pianito.vue';
import ScoreViewportPixi from './components/ScoreViewport-Pixi/ScoreViewport.vue';
import ScoreViewportSvg from './components/ScoreViewport-Svg/ScoreViewport.vue';
import SkipBar from './components/SkipBar.vue';
import TimeScrollBar from "./components/TimeScrollBar.vue";
import TooltipDisplayer from './components/TooltipDisplayer.vue';
import { Tool } from './dataTypes/Tool';
import isDev from './functions/isDev';
import { keyBindingsListener } from './functions/keyBindingsListener';
import { KeyActions, getActionForKeys } from './keyBindings';
import CustomOctaveTableTextEditor from './modals/CustomOctaveTableTextEditor.vue';
import Modal from './modals/Modal.vue';
import UserDisclaimer from './modals/UserDisclaimer.vue';
import Harp from './overlays/Harp.vue';
import RightPane from './right-pane/RightPane.vue';
import { useBottomPaneStateStore } from './store/bottomPaneStateStore';
import { ViewportTech, useCustomSettingsStore } from './store/customSettingsStore';
import { useExclusiveContentsStore } from './store/exclusiveContentsStore';
import { useHistoryStore } from './store/historyStore';
import { useLibraryStore } from './store/libraryStore';
import { useMonoModeInteraction } from './store/monoModeInteraction';
import { usePlaybackStore } from './store/playbackStore';
import { useProjectStore } from './store/projectStore';
import { useSelectStore } from './store/selectStore';
import { useSnapStore } from './store/snapStore';
import { useToolStore } from './store/toolStore';
import { useViewStore } from './store/viewStore';
import { useNotesStore } from './store/notesStore';

const libraryStore = useLibraryStore();
const monoModeInteraction = useMonoModeInteraction();
const tool = useToolStore();
const view = useViewStore();
const playback = usePlaybackStore();
const project = useProjectStore();
const selection = useSelectStore();
const notes = useNotesStore();
const snap = useSnapStore();
const mouseWidget = ref();
const modalText = ref("");
const clickOutsideCatcher = ref();
const history = useHistoryStore();
const mainInteraction = monoModeInteraction.getInteractionModal("default");
const autosaveTimeout = ref<(ReturnType<typeof setInterval>) | null>(null);
const sidePaneWidth = ref(300);
const viewport = ref<HTMLElement>();
const userSettings = useCustomSettingsStore();
const exclusiveContentsStore = useExclusiveContentsStore();
const bottomPaneStateStore = useBottomPaneStateStore();



provide('modalText', modalText);


// concerning middle wheel dragging to pan
let draggingView = false;
let viewDragStartX = 0;
let viewDragStartTime = 0;
let viewDragStartY = 0;
let viewDragStartOctave = 0;
let viewTouchDistanceStart = 0;
let viewDragStartOctaveHeight = 0;


const mouseWheelListener = (e: WheelEvent) => {
    e.preventDefault();
    zoomAround(view.viewHeightOctaves ** (1 + e.deltaY / 1000), e.clientX, e.clientY);
}

const zoomAround = (
    wouldViewHeightOctaves: number,
    zoomCenterX: number,
    zoomCenterY: number
) => {

    const OTDatumBefore = {
        time: view.pxToTimeWithOffset(zoomCenterX),
        octave: -view.pxToOctaveWithOffset(zoomCenterY),
    };

    if (
        wouldViewHeightOctaves < 200 &&
        wouldViewHeightOctaves > 0.1
    ) {
        view.viewHeightOctaves = wouldViewHeightOctaves;
    }

    view.applyRatioToTime();

    // offset zoom center back 
    const OTDAtumAfter = {
        time: view.pxToTimeWithOffset(zoomCenterX),
        octave: -view.pxToOctaveWithOffset(zoomCenterY),
    };

    const OTDatumDelta = {
        time: OTDatumBefore.time - OTDAtumAfter.time,
        octave: OTDatumBefore.octave - OTDAtumAfter.octave,
    };

    view.timeOffset += OTDatumDelta.time;
    view.octaveOffset += OTDatumDelta.octave;

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
    console.log("mouse dn", e);
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
let singleTouchTimer = false as false | ReturnType<typeof setTimeout>
const touchDownListener = (e: TouchEvent) => {
    console.log(e.touches.length)
    switch (e.touches.length) {
        case 1: {
            if(singleTouchTimer) {
                clearTimeout(singleTouchTimer);
            }

            singleTouchTimer = setTimeout(() => {
                tool.touchDown(e.touches[0]);
                singleTouchTimer = false;
            }, 300);
            break;
        }
        case 2: {
            if(singleTouchTimer) {
                clearTimeout(singleTouchTimer);
            }
            const averageX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const averageY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            e.stopPropagation();
            e.preventDefault();
            draggingView = true;
            viewDragStartX = averageX;
            viewDragStartTime = view.timeOffset;
            viewDragStartY = averageY;
            viewDragStartOctave = view.octaveOffset;
            viewDragStartOctaveHeight = view.viewHeightOctaves;
            viewTouchDistanceStart = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            break;
        }
    }
}

const touchMoveListener = (e: TouchEvent) => {
    const averageX = Array.from(e.touches).reduce((acc: number, t: { clientX: number }) => acc + t.clientX, 0) / e.touches.length;
    const averageY = Array.from(e.touches).reduce((acc: number, t: { clientY: number }) => acc + t.clientY, 0) / e.touches.length;

    if (mouseWidget.value) {
        // TODO: Use a cursor instead, this is unnecessarily expensive
        mouseWidget.value.style.left = averageX + 10 + "px";
        mouseWidget.value.style.top = averageY + 10 + "px";
    }
    if (draggingView) {
        // testTouchEl.style.left = averageX + 'px';
        // testTouchEl.style.top = averageY + 'px';
        // pan view, if dragging middle wheel
        const deltaX = averageX - viewDragStartX;
        const deltaY = averageY - viewDragStartY;

        const newDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

        const touchDistanceDelta = newDistance - viewTouchDistanceStart;
        const newOctaves = viewDragStartOctaveHeight + view.pxToOctave(touchDistanceDelta);
        zoomAround(newOctaves, averageX, averageY);

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
        tool.touchMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
    }

}

const touchUpListener = (e: TouchEvent) => {
    draggingView = false;
    if (e.touches.length === 0) {
        tool.touchUp(e.changedTouches[0]);
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
    keyBindingsListener(e, { selection, tool, playback, view, history, project, notes });
}

const tryLoadStart = async () => {
    try {
        console.log("loading project " + project.name);
        await libraryStore.loadFromLibraryItem(project.name);
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
        libraryStore.autoSave();
    }
    tryLoadStart();
    if (autosaveTimeout.value) clearInterval(autosaveTimeout.value);
    autosaveTimeout.value = setInterval(autosaveCall, 10000);

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
    mainInteraction.addEventListener($viewPort, 'touchstart', touchDownListener);
    mainInteraction.addEventListener($viewPort, 'touchmove', touchMoveListener);
    mainInteraction.addEventListener($viewPort, 'touchend', (e: TouchEvent) => {
        touchUpListener(e);
        snap.resetSnapExplanation();
    });



    window.addEventListener('contextmenu', (e: MouseEvent) => {
        if (isDev()) return;
        e.preventDefault();
        e.stopPropagation();
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
    bottomPaneStateStore.totalHeight;
    viewportSize.value = {
        width: window.innerWidth - sidePaneWidth.value,
        height: window.innerHeight - bottomPaneStateStore.totalHeight,
    };
    view.updateSize(viewportSize.value.width, viewportSize.value.height);
};

const viewportSize = ref({ width: 0, height: 0 });

watch([sidePaneWidth, bottomPaneStateStore], () => {
    resize();
})


</script>
<template>
    <div id="app-container">
        <div id="viewport" ref="viewport"
            :style="{ position: 'absolute', width: viewportSize.width + 'px', height: viewportSize.height + 'px' }">
            <ScoreViewportPixi v-if="userSettings.viewportTech === ViewportTech.Pixi" :width="viewportSize.width"
                :height="viewportSize.height" />
            <ScoreViewportSvg v-else-if="userSettings.viewportTech === ViewportTech.Svg" :width="viewportSize.width"
                :height="viewportSize.height" />
            <TimeScrollBar style="position:absolute; left:0; bottom:0;" />
            <Suspense>
                <FtView v-if="tool.ftRec" />
            </Suspense>
        </div>
        <div style="position: absolute; top: 0; left: 0;pointer-events: none;" ref="mouseWidget">
            {{ tool.currentMouseStringHelper }}
        </div>
        <div style="position:absolute; right:0; top:0; z-index: 2">
            <RightPane :paneWidth="sidePaneWidth" :paneHeight="viewportSize.height" />
            <Button :onClick="() => sidePaneWidth = sidePaneWidth ? 0 : 300" style="position:absolute"
                :style="{ right: sidePaneWidth + 'px' }">

                <AnglesRight v-if="sidePaneWidth" />
                <AnglesLeft v-else />
            </Button>
        </div>
        <Pianito v-if="tool.showReferenceKeyboard" />
        <BottomPane />
        <SkipBar />

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
    <Modal name="plot util" style="display:block; width:90vw; height:90vh;">
        <WorkletWorkbench />
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
    <MousePopupDisplayer />

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

</style>
