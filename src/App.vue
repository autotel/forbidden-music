<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';
import { onMounted, onUnmounted, provide, ref, watch } from 'vue';
import Button from "./components/Button.vue";
import LibraryManager from './components/LibraryManager.vue';
import TimeGrid from './components/MusicTimeGrid.vue';
import NoteElement from './components/NoteElement.vue';
import Pianito from './components/Pianito.vue';
import RangeSelection from './components/RangeSelection.vue';
import SnapSelector from './components/SnapSelector.vue';
import SynthEdit from './components/SynthEdit.vue';
import TimeScrollBar from "./components/TimeScrollBar.vue";
import ToneGrid from './components/ToneGrid.vue';
import ToneRelation from './components/ToneRelation.vue';
import ToolSelector from './components/ToolSelector.vue';
import Transport from './components/Transport.vue';
import { EditNote } from './dataTypes/EditNote';
import { Note } from './dataTypes/Note';
import { Tool } from './dataTypes/Tool';
import { useProjectStore } from './store/projectStore';
import { usePlaybackStore } from './store/playbackStore';
import { useScoreStore } from './store/scoreStore';
import { useSelectStore } from './store/selectStore';
import { useSnapStore } from './store/snapStore';
import { useToolStore, MouseDownActions } from './store/toolStore';
import { useViewStore, View } from './store/viewStore';
import Modal from './components/Modal.vue';
import CustomOctaveTableTextEditor from './components/CustomOctaveTableTextEditor.vue';
import { useMonoModeInteraction } from './store/monoModeInteraction';
import { useLibraryStore } from './store/libraryStore';

const libraryStore = useLibraryStore();
const monoModeInteraction = useMonoModeInteraction();
const tool = useToolStore();
const timedEventsViewport = ref<SVGSVGElement>();
const view = useViewStore();
const playback = usePlaybackStore();
const score = useScoreStore();
const editNotes = useProjectStore();
const select = useSelectStore();
const mouseWidget = ref();
const modalText = ref("");
const clickOutsideCatcher = ref();
const snap = useSnapStore();

const mainInteraction = monoModeInteraction.createInteractionModal("default");

provide('modalText', modalText);


// concerning middle wheel dragging to pan
let draggingView = false;
let viewDragStartX = 0;
let viewDragStartTime = 0;
let viewDragStartY = 0;
let viewDragStartOctave = 0;

const mouseWheelListener = (e: WheelEvent) => {
        view.viewWidthTime **= 1 + e.deltaY / 1000;
        view.viewHeightOctaves **= 1 + e.deltaY / 1000;
        // prevent viewWidthTime from going out of bounds
        if (view.viewWidthTime < 0.1) {
            view.viewWidthTime = 0.1;
        }
    }

const mouseMoveListener = (e: MouseEvent) => {
    if (mouseWidget.value) {
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


const keyDownListener = (e: KeyboardEvent) => {
    if(e.target instanceof HTMLInputElement) {
        return;
    }
    // delete selected notes
    if (e.key === 'Delete') {
        editNotes.list = editNotes.list.filter(note => !note.selected);
        select.clear();
    }
    // alt activates tool copyOnDrag mode
    if (e.altKey) {
        tool.copyOnDrag = true;
        const dectl = (e: KeyboardEvent) => {
            if (e.key == "Alt") {
                tool.copyOnDrag = false;
                window.removeEventListener('keyup', dectl);
            }
        }
        window.addEventListener('keyup', dectl);
    }
    // space plays/stops
    if (e.key === ' ') {
        if (playback.playing) {
            playback.stop();
        } else {
            playback.play();
        }
    }
    if (e.ctrlKey) {
        // const prevTool = tool.current;
        tool.current = Tool.Select;
        const dectl = (e: KeyboardEvent) => {
            if (e.key == "Control") {
                tool.current = Tool.Edit;
                window.removeEventListener('keyup', dectl);
            }
        }
        window.addEventListener('keyup', dectl);
    }
    if (e.ctrlKey && e.key === 's') {
        // const json = JSON.stringify(editNotes.list.map(note => note.note));
        // const blob = new Blob([json], { type: 'application/json' });
        // const url = URL.createObjectURL(blob);
        // window.open(url);
        // // save json to cookie
        // document.cookie = "score=" + json;
        console.log("saved");
        libraryStore.saveCurrent();
        e.preventDefault();
        e.stopPropagation();
    }

    if (e.key === 'Escape') {
        select.clear();
        tool.resetState();

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

const resize = () => {
    const $viewPort = timedEventsViewport.value;
    if (!$viewPort) throw new Error("timedEventsViewport not found");

    $viewPort.style.width = window.innerWidth - 2 + "px";
    $viewPort.style.height = window.innerHeight - 2 + "px";
    
    view.updateSize(window.innerWidth, window.innerHeight);

};


onMounted(() => {
    const $viewPort = timedEventsViewport.value;
    if (!$viewPort) throw new Error("timedEventsViewport not found");

    if (clickOutsideCatcher.value) {
        window.addEventListener('wheel', (e) => {
            if (e.target === clickOutsideCatcher.value) {
                // not working :/
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        });
    }

    resize();
    
    mainInteraction.addEventListener($viewPort,'mousedown', mouseDownListener);
    mainInteraction.addEventListener($viewPort,'mousemove', mouseMoveListener);
    mainInteraction.addEventListener($viewPort,'wheel', mouseWheelListener);

    window.addEventListener('mouseup', mouseUpListener);

    mainInteraction.addEventListener(window,'keydown', keyDownListener);
    mainInteraction.addEventListener(window,'resize', resize);



    // import score from cookie
    const cookie = document.cookie;
    const scoreCookie = cookie.split(';').find(c => c.startsWith('score='));
    if (scoreCookie) {
        const json = scoreCookie.split('=')[1];
        editNotes.list = JSON.parse(json).map((note: Note, index: number) => {
            console.log("import note", index, ":", note);
            return new EditNote(note as Note, view);
        });
    }

})

onUnmounted(() => {

    const $viewPort = timedEventsViewport.value;
    if (!$viewPort) throw new Error("timedEventsViewport not found");
    
    window.removeEventListener('mouseup', mouseUpListener);
    mainInteraction.removeAllEventListeners();
});


</script>
<template>
    <div>
        <svg id="viewport" ref="timedEventsViewport" :class="tool.cursor">
            <g id="grid">
                <TimeGrid />
                <ToneGrid />
            </g>
            <g id="tone-relations">
                <ToneRelation />
            </g>
            <g id="note-would-be-created">
                <NoteElement v-if="tool.noteThatWouldBeCreated" :editNote="tool.noteThatWouldBeCreated" interactionDisabled />
            </g>
            <line id="playbar" :x1=playback.playbarPxPosition y1="0" :x2=playback.playbarPxPosition y2="100%"
                stroke-width="1" />
            <g id="edit-notes">
                <NoteElement v-for="editNote in view.visibleNotes" :editNote="editNote" :key="editNote.udpateFlag" />
            </g>
            <g id="notes-being-created">
                <NoteElement v-for="editNote in tool.notesBeingCreated" :editNote="editNote" />
            </g>
            <RangeSelection />
        </svg>
        <TimeScrollBar />
        <div style="position: absolute; top: 0; left: 0;pointer-events: none;" ref="mouseWidget">
            {{ tool.currentMouseStringHelper }}
        </div>

        <div style="position: fixed; bottom:0; right: 0;">
            <ToolSelector />
        </div>
        <Pianito v-if="tool.showReferenceKeyboard" />
        <div style="position: fixed; bottom: 0;">
            <Transport />
        </div>
        <div class="drawers-container">
            <LibraryManager />
            <SynthEdit />
            <SnapSelector />
        </div>
    </div>
    <Modal name="credits modal" :onClose="() => modalText = ''">
            <pre>{{ (modalText) }}</pre>
    </Modal>
    <Modal name="octave table editor">
        <CustomOctaveTableTextEditor />
    </Modal>
</template>

<style scoped>
.drawers-container {
    position: fixed;
    top: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: auto;
}
.unclickable {
    pointer-events: none;

}


svg#viewport.cursor-note-length {
    cursor: col-resize;
    cursor: ew-resize;
}

svg #playbar {
    stroke: rgb(95, 0, 0);
}

svg#viewport.cursor-draw {
    cursor: url("./assets/icons-iconarchive-pen.png?url") 3 3, crosshair;
}

svg#viewport.cursor-move {
    cursor: move;
}

svg#viewport.cursor-grab {
    cursor: grab;
}

svg#viewport.cursor-grabbing {
    cursor: grabbing;
}

svg#viewport {
    position: absolute;
    top: 0;
    left: 0;
}

g#notes-being-created rect.body {
    fill: transparent;
}

text,
t {
    user-select: none;
}
</style>