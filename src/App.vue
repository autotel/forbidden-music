<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';
import { onMounted, onUnmounted, ref } from 'vue';
import Button from "./components/Button.vue";
import TimeGrid from './components/MusicTimeGrid.vue';
import NoteElement from './components/NoteElement.vue';
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
import { useEditNotesStore } from './store/editNotesStore';
import { usePlaybackStore } from './store/playbackStore';
import { useScoreStore } from './store/scoreStore';
import { useSelectStore } from './store/selectStore';
import { useToolStore, MouseDownActions } from './store/toolStore';
import { useViewStore } from './store/viewStore';
const tool = useToolStore();
const timedEventsViewport = ref<SVGSVGElement>();
const playbackStore = usePlaybackStore();
const view = useViewStore();
const playback = usePlaybackStore();
const score = useScoreStore();
const editNotes = useEditNotesStore();
const select = useSelectStore();
const mouseWidget = ref();

// persist state in localStorage
const storage = useLocalStorage(
    'forbidden-music',
    editNotes.list,
)


// concerning middle wheel dragging to pan
let draggingView = false;
let viewDragStartX = 0;
let viewDragStartTime = 0;
let viewDragStartY = 0;
let viewDragStartOctave = 0;

const mouseMoveListener = (e: MouseEvent) => {
    if (mouseWidget.value) {
        mouseWidget.value.style.left = e.clientX + 10 + "px";
        mouseWidget.value.style.top = e.clientY + 10 + "px";
    }
    if (draggingView) {
        // pan view, if dragging middle wheel
        const deltaX = e.clientX - viewDragStartX;
        const deltaY = e.clientY - viewDragStartY;
        // oddness commented elsewhere
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

onMounted(() => {

    //make the timedEventsViewport always fill the window
    const $viewPort = timedEventsViewport.value;
    if (!$viewPort) throw new Error("timedEventsViewport not found");

    const resize = () => {
        $viewPort.style.width = window.innerWidth - 2 + "px";
        $viewPort.style.height = window.innerHeight - 2 + "px";

        view.updateSize(window.innerWidth, window.innerHeight);

    };
    window.addEventListener('resize', resize);
    resize();


    // when user drags on the viewport, add a note an extend it's duration
    $viewPort.addEventListener('mousedown', (e) => {
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
    });

    window.addEventListener('mousemove', mouseMoveListener);

    window.addEventListener('mouseup', (e) => {
        tool.mouseUp(e);
        // stop panning view, if it were
        draggingView = false;
    });

    // TODO: well, this all needs refactor
    // export score
    window.addEventListener('keydown', (e) => {
        // pressing s plays 440 hertz in playbackStore synth
        if (e.key === 's') {
            playback.synth.playNoteEvent(0, 1, 440);
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
            const prevTool = tool.current;
            tool.current = Tool.Select;
            const dectl = (e: KeyboardEvent) => {
                if (e.key == "Control") {
                    tool.current = prevTool;
                    window.removeEventListener('keyup', dectl);
                }
            }
            window.addEventListener('keyup', dectl);
        }
        if (e.ctrlKey && e.key === 's') {
            const json = JSON.stringify(editNotes.list.map(note => note.note));
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            window.open(url);
            // save json to cookie
            document.cookie = "score=" + json;
            console.log("saved");
        }


    });


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
    window.removeEventListener('mousemove', mouseMoveListener);
});
const clear = () => {
    editNotes.clear();
}

</script>
<template>

    <svg id="viewport" ref="timedEventsViewport" :class="tool.cursor">
        <g id="grid">
            <TimeGrid />
            <ToneGrid />
        </g>
        <g id="tone-relations">
            <ToneRelation />
        </g>
        <line :x1=playback.playbarPxPosition y1="0" :x2=playback.playbarPxPosition y2="100%" stroke="red"
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
    <div style="position: fixed;">
        <Button :onClick="clear" danger>clear</Button>
        <ToolSelector />
    </div>
    <div style="position: absolute; top: 0; left: 0;pointer-events: none;" ref="mouseWidget">
        {{ tool.currentMouseStringHelper }}
    </div>

    <div style="position: fixed; bottom: 0;">
        <SnapSelector />
        <Transport />
    </div>
    <Suspense>
        <SynthEdit />
    </Suspense>
</template>

<style>
svg#viewport.cursor-note-length {
    cursor: col-resize;
    cursor: ew-resize;
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