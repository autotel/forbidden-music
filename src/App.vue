<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUnmounted, provide, ref, watch, watchEffect } from 'vue';
import Button from './components/Button.vue';
import Pianito from './components/Pianito.vue';
import TimeScrollBar from "./components/TimeScrollBar.vue";
import ToolSelector from './components/ToolSelector.vue';
import Transport from './components/Transport.vue';
import AnglesLeft from './components/icons/AnglesLeft.vue';
import AnglesRight from './components/icons/AnglesRight.vue';
import { Tool } from './dataTypes/Tool';
import { ifDev } from './functions/isDev';
import { KeyActions, getActionForKeys } from './keyBindings';
import CustomOctaveTableTextEditor from './modals/CustomOctaveTableTextEditor.vue';
import Modal from './modals/Modal.vue';
import UserDisclaimer from './modals/UserDisclaimer.vue';
import Pane from './pane/Pane.vue';
import { useLibraryStore } from './store/libraryStore';
import { useMonoModeInteraction } from './store/monoModeInteraction';
import { usePlaybackStore } from './store/playbackStore';
import { useProjectStore } from './store/projectStore';
import { useSelectStore } from './store/selectStore';
import { useToolStore } from './store/toolStore';
import { useUndoStore } from './store/undoStore';
import { useViewStore } from './store/viewStore';
import ScoreViewport from './components/ScoreViewport-Pixi/ScoreViewport.vue';
import ScoreViewportOld from './components/ScoreViewport-Svg/ScoreViewport.vue';
import ScoreViewportRawCanvas from './components/ScoreViewport-Canvas/ScoreViewport.vue';
import { ViewportTech, useCustomSettingsStore } from './store/customSettingsStore';
import Tooltip from './components/Tooltip.vue';

const libraryStore = useLibraryStore();
const monoModeInteraction = useMonoModeInteraction();
const tool = useToolStore();
const view = useViewStore();
const playback = usePlaybackStore();
const project = useProjectStore();
const selection = useSelectStore();
const mouseWidget = ref();
const modalText = ref("");
const clickOutsideCatcher = ref();
const undoStore = useUndoStore();
const mainInteraction = monoModeInteraction.getInteractionModal("default");
const autosaveTimeout = ref<(ReturnType<typeof setInterval>) | null>(null);
const paneWidth = ref(300);
const viewport = ref<SVGSVGElement>();
const userSettings = useCustomSettingsStore();
const useNewView = ref(true);

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


    const wouldViewWidthTime = view.viewWidthTime ** (1 + e.deltaY / 1000);
    const wouldViewHeightOctaves = view.viewHeightOctaves ** (1 + e.deltaY / 1000);

    if (wouldViewWidthTime < 400 && wouldViewHeightOctaves > 0.1) {
        view.viewWidthTime = wouldViewWidthTime;
        view.viewHeightOctaves = wouldViewHeightOctaves;
    }


    const viewMousePositionAfter = {
        time: view.pxToTimeWithOffset(e.clientX),
        octave: -view.pxToOctaveWithOffset(e.clientY),
    }

    view.timeOffset += viewMousePositionBefore.time - viewMousePositionAfter.time;
    view.octaveOffset += viewMousePositionBefore.octave - viewMousePositionAfter.octave;

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
    const keyAction = getActionForKeys(e.key, e.ctrlKey, e.shiftKey, e.altKey);
    switch (keyAction) {
        case KeyActions.Delete: {
            project.score = project.score.filter(note => !note.selected)
            // minimalistic option:
            // tool.noteBeingHovered = false;
            // programmatic option:
            tool.resetState();
            selection.clear();
            break;
        }
        case KeyActions.ActivateCopyOnDrag: {
            tool.copyOnDrag = true;
            break;
        }
        case KeyActions.PlayPause: {
            e.preventDefault();
            if (playback.playing) {
                playback.stop();
            } else {
                playback.play();
            }
            break;
        }
        case KeyActions.ActivateAreaSelectionMode: {
            tool.currentLeftHand = Tool.Select;
            break;
        }
        case KeyActions.ActivateModulationMode: {
            tool.current = tool.current === Tool.Modulation ? Tool.Edit : Tool.Modulation;
            break;
        }
        case KeyActions.MuteSelectedEvents: {
            selection.getNotes().forEach(eNote => eNote.mute = !eNote.mute);
            break;
        }
        case KeyActions.Undo: {
            console.log("undo");
            undoStore.undo();
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.SelectAll: {
            console.log("select all");
            selection.selectAll();
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.MoveDown: {
            console.log("move down");
            selection.getNotes().forEach(eNote => eNote.octave -= 1);
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.MoveUp: {
            console.log("move up");
            selection.getNotes().forEach(eNote => eNote.octave += 1);
            e.preventDefault();
            e.stopPropagation();

            break;
        }
        case KeyActions.MoveLeft: {
            console.log("move left");
            selection.getNotes().forEach(eNote => eNote.time -= 1);
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.MoveRight: {
            console.log("move right");
            selection.getNotes().forEach(eNote => eNote.time += 1);
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.Exit: {
            selection.clear();
            tool.resetState();
            break;
        }
        case KeyActions.OnlyAllowHorizontalMovement: {
            tool.disallowOctaveChange = !tool.disallowOctaveChange;
            break;
        }
        case KeyActions.OnlyAllowVerticalMovement: {
            tool.disallowTimeChange = !tool.disallowTimeChange;
            break;
        }
        case KeyActions.Group: {
            // not ready
            ifDev(() => {
                console.log("group");
                project.setNotesGroupToNewGroup(selection.getNotes());
                e.preventDefault();
                e.stopPropagation();
            }).elseLog("group feature in development");
            break;
        }
        case KeyActions.Reboot: {
            window.location.reload();
            // lol
            break;
        }

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


    libraryStore.loadFromLibraryItem(project.name);
    let autosaveCall = () => {
        if (project.name === "unnamed (autosave)") {
            libraryStore.saveCurrent();
        }
    }
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
    <div>
        <div ref="viewport"
            :style="{ position: 'absolute', width: viewportSize.width + 'px', height: viewportSize.height + 'px' }">
            <ScoreViewport v-if="userSettings.viewportTech === ViewportTech.Pixi" :width="viewportSize.width"
                :height="viewportSize.height" />
            <ScoreViewportRawCanvas v-else-if="userSettings.viewportTech === ViewportTech.Canvas"
                :width="viewportSize.width" :height="viewportSize.height" />
            <ScoreViewportOld v-else-if="userSettings.viewportTech === ViewportTech.Svg" :width="viewportSize.width"
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
        <div style="position: fixed; bottom:0; right: 0;">
            <ToolSelector />
        </div>
        <div style="position: fixed; bottom: 0;">
            <Transport />
        </div>
    </div>
    <Modal name="credits modal" :onClose="() => modalText = ''">
        <pre>{{ (modalText) }}</pre>
    </Modal>
    <Modal name="octave table editor">
        <CustomOctaveTableTextEditor />
    </Modal>
    <UserDisclaimer />

    <Tooltip/>
</template>
<style scoped>
.unclickable {
    pointer-events: none;

}
</style>


<style>
.full-width {
    width: 100%;
    box-sizing: border-box;
}

* {
    user-select: none;
}
</style>