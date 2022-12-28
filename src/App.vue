<script setup lang="ts">
import { useViewStore } from './store/viewStore';
import { onMounted, Ref, ref, watchEffect } from 'vue';
import { usePlaybackStore } from './store/playbackStore';
import TimeScrollBar from "./components/TimeScrollBar.vue"
import NoteElement from './components/NoteElement.vue';
import ToolSelector from './components/ToolSelector.vue';
import SnapSelector from './components/SnapSelector.vue';
import Button from "./components/Button.vue";
import Transport from './components/Transport.vue';
import { useToolStore } from './store/toolStore';
import { useEditStore } from './store/editStore';
import { useScoreStore } from './store/scoreStore';
import { Tool } from './dataTypes/Tool';
import RangeSelection from './components/RangeSelection.vue';
import { EditNote } from './dataTypes/EditNote';
import { Note } from './dataTypes/Note';
import Grid from './components/MusicTimeGrid.vue';
const tool = useToolStore();
const timedEventsViewport = ref<SVGSVGElement>();

const view = useViewStore();
const playback = usePlaybackStore();
const edit = useEditStore();
const score = useScoreStore();

// when editNotes changes, also change score
watchEffect(() => {
    score.notes = view.editNotes.map(note => note.note);
});

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


    // concerning middle wheel dragging to pan
    let draggingView = false;
    let viewDragStartX = 0;
    let viewDragStartTime = 0;
    let viewDragStartY = 0;
    let viewDragStartOctave = 0;

    console.log(edit, edit.mouseDown);
    // when user drags on the viewport, add a note an extend it's duration
    $viewPort.addEventListener('mousedown', (e) => {
        console.log("mouse tool", tool.current);


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
            if (tool.current !== Tool.Edit) return;
            edit.mouseDown(e);

        }
    });

    window.addEventListener('mousemove', (e) => {
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

            edit.mouseMove(e);
        }
    });

    window.addEventListener('mouseup', (e) => {
        edit.mouseUp(e);
        // stop panning view, if it were
        draggingView = false;
    });

    // export score
    window.addEventListener('keydown', (e) => {
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
            const json = JSON.stringify(view.editNotes.map(note => note.note));
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
        view.editNotes = JSON.parse(json).map((note: Note, index: number) => {
            console.log("import note", index, ":", note);
            return new EditNote(note as Note, view);
        });
    }

})

const clear = () => {
    view.editNotes.splice(0);
}

// const noteRect = (note: Note) => {
//     const isCut = note.start < view.timeOffset;
//     const cutTimeWidth = isCut ? note.start - view.timeOffset : 0;
//     return {
//         x: clampToZero(view.timeToPxWithOffset(note.start)),
//         w: view.timeToPx(note.duration + cutTimeWidth),
//         y: view.octaveToPxWithOffset(note.octave),
//         cut: isCut,
//         note: note,
//     }
// }
// const getScopednotes = () => {
//     return view.visibleNotes.map(note => {
//         return new EditNote(note);
//     });
// }
</script>
<template>

    <svg id="viewport" ref="timedEventsViewport">
        <Grid />
        <line :x1=playback.playbarPxPosition y1="0" :x2=playback.playbarPxPosition y2="100%" stroke="red"
            stroke-width="1" />
        <NoteElement v-for="editNote in view.editNotes" :editNote="editNote" :key="editNote.udpateFlag" />
        <NoteElement v-if="edit.noteBeingCreated" :editNote="edit.noteBeingCreated" />
        <RangeSelection />
    </svg>
    <TimeScrollBar />
    <div style="position: fixed;">
        <Button :onClick="clear" danger>clear</Button>
        <ToolSelector />
    </div>
    <div style="position: fixed; bottom: 0;">
        <SnapSelector />
        <Transport />
    </div>
</template>

<style>
svg#viewport {
    position: absolute;
    top: 0;
    left: 0;
    cursor: crosshair;
}

text,
t {
    user-select: none;
}
</style>