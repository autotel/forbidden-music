<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Note } from '../dataTypes/Note';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
import Fraction from 'fraction.js';
import ToolSelector from './ToolSelector.vue';
import { weirdFloatToString } from '../functions/weirdFloatToString';
import { Tool } from '../dataTypes/Tool';

const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    noteRect: {
        x: number,
        y: number,
        w: number,
        note: Note,
        
    }
}>();

const noteBody = ref<SVGRectElement>();
const rightEdge = ref<SVGRectElement>();
const getVisibleNotes = () => view.visibleNotes;
let noteBeingEdited = props.noteRect.note;
let startX = 0;
let startY = 0;
let startNoteStart = 0;
let startNoteOctave = 0;
let startNoteDuration = 0;

enum DragMode {
    None,
    Move,
    Resize,
}

let dragMode = DragMode.None;

let __$rightEdgeBody: SVGRectElement;

const getRightEdgeBody = () => {
    if (__$rightEdgeBody) return __$rightEdgeBody;
    if (!rightEdge.value) throw new Error("rightEdgeBody not found");
    __$rightEdgeBody = rightEdge.value;
    return __$rightEdgeBody;
}
let __$noteBody: SVGRectElement;
const getNoteBody = () => {
    if (__$noteBody) return __$noteBody;
    if (!noteBody.value) throw new Error("noteBody not found");
    __$noteBody = noteBody.value;
    return __$noteBody;
}

const mouseDownListener = (e: MouseEvent) => {
    // common
    if(tool.current !== Tool.Edit) return;
    let $noteBody = getNoteBody();
    e.stopPropagation();
    startNoteOctave = noteBeingEdited.octave;
    noteBeingEdited = props.noteRect.note;
    startNoteStart = noteBeingEdited.start;
    $noteBody.style.cursor = 'grabbing';
    dragMode = DragMode.Move;
    // horizontal
    startX = e.clientX;
    // vertical
    startY = e.clientY;
}
const rightEdgeMouseDownListener = (e: MouseEvent) => {
    if(tool.current !== Tool.Edit) return;
    e.stopPropagation();
    startX = e.clientX;
    startNoteDuration = noteBeingEdited.duration;
    dragMode = DragMode.Resize;
}
const mouseMoveListener = (e: MouseEvent) => {
    // horizontal
    e.stopPropagation();
    const timeDelta = view.pxToTime(e.clientX - startX);
    if (dragMode === DragMode.None) {
        return
    } else if (dragMode === DragMode.Resize) {
        noteBeingEdited.duration = startNoteDuration + timeDelta;
    } else if (dragMode === DragMode.Move) {
        // horizontal
        noteBeingEdited.start = startNoteStart + timeDelta;
        // vertical
        // prevent pitch change if 'alt' key is pressed
        // TODO: should draw a horizontal line to represent the constraint of movement.
        if (e.altKey) return;
        const octaveDelta = view.pxToOctave(e.clientY - startY);
        let targetOctave = startNoteOctave + octaveDelta;
        const visibleNotes = getVisibleNotes().filter(n => n !== noteBeingEdited);
        const {
            note
        } = tool.snap(
            noteBeingEdited,
            targetOctave,
            visibleNotes
        );
        noteBeingEdited.octave = note.octave;
    }

};
const mouseUpListener = (e: MouseEvent) => {
    dragMode = DragMode.None;
    // common
    let $noteBody = getNoteBody();
    // horizontal
    e.stopPropagation();
    $noteBody.style.cursor = 'grab';
    //vertical
}
onMounted(() => {
    const $rightEdge = getRightEdgeBody();
    const $noteBody = getNoteBody();
    $noteBody.addEventListener('mousedown', mouseDownListener);
    $rightEdge.addEventListener('mousedown', rightEdgeMouseDownListener);
    window.addEventListener('mousemove', mouseMoveListener);
    window.addEventListener('mouseup', mouseUpListener);
});
onUnmounted(() => {
    const $rightEdge = getRightEdgeBody();
    const $noteBody = getNoteBody();
    $noteBody.removeEventListener('mousedown', mouseDownListener);
    $rightEdge.removeEventListener('mousedown', rightEdgeMouseDownListener);
    window.removeEventListener('mousemove', mouseMoveListener);
    window.removeEventListener('mouseup', mouseUpListener);
});
</script>
<template>
    <text :x="noteRect.x" :y="noteRect.y + 9" font-size="10">{{ weirdFloatToString(noteRect.note.octave) }} Octs.</text>
    <text :x="noteRect.x" :y="noteRect.y + 23" font-size="10">{{ weirdFloatToString(noteRect.note.frequency) }}
        Hz.</text>
    <text :x="noteRect.x" :y="noteRect.y + 37" font-size="10">{{ weirdFloatToString(noteRect.note.start) }} Ts.</text>
    <text :x="noteRect.x" :y="noteRect.y + 51" font-size="10">{{ weirdFloatToString(noteRect.note.duration) }} Ts.</text>
    <rect class="body" ref="noteBody" :x="noteRect.x" :y="noteRect.y" :width="noteRect.w" height="10" />
    <rect class="rightEdge" ref="rightEdge" :x="noteRect.x + noteRect.w - 5" :y="noteRect.y" width="5" :height="10" />
</template>
<style scoped>
.body {
    fill: #888a;
    stroke: #999;
    cursor: move;
}

.rightEdge {
    fill: #f88a;
    stroke: #999;
    cursor: ew-resize;
}

.relation {
    stroke: #999;
    stroke-width: 1;
    stroke-dasharray: 5;
}
</style>
