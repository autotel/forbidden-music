<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Note } from '../dataTypes/Note';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
import { useEditStore } from '../store/editStore';
import Fraction from 'fraction.js';
import ToolSelector from './ToolSelector.vue';
import { weirdFloatToString } from '../functions/weirdFloatToString';
import { Tool } from '../dataTypes/Tool';
import { useSelectStore } from '../store/selectStore';
import { EditNote } from '../dataTypes/EditNote';

const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    editNote: EditNote
}>();
// TODO: perhaps the dragging and moving procedures should be on a store, not on this component
const select = useSelectStore();
const edit = useEditStore();
const noteBody = ref<SVGRectElement>();
const rightEdge = ref<SVGRectElement>();
const getVisibleNotes = () => view.visibleNotes;
let noteBeingEdited = props.editNote;
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

// const mouseDownListener = (e: MouseEvent) => {
//     // common
//     if (tool.current !== Tool.Edit) return;
//     let $noteBody = getNoteBody();
//     e.stopPropagation();
//     startNoteOctave = noteBeingEdited.note.octave;
//     noteBeingEdited = props.editNote.note;
//     startNoteStart = noteBeingEdited.start;
//     $noteBody.style.cursor = 'grabbing';
//     dragMode = DragMode.Move;
//     // horizontal
//     startX = e.clientX;
//     // vertical
//     startY = e.clientY;
// }
// const rightEdgeMouseDownListener = (e: MouseEvent) => {
//     if (tool.current !== Tool.Edit) return;
//     e.stopPropagation();
//     startX = e.clientX;
//     startNoteDuration = noteBeingEdited.duration;
//     dragMode = DragMode.Resize;
// }
// const mouseMoveListener = (e: MouseEvent) => {
//     // horizontal
//     e.stopPropagation();
//     const timeDelta = view.pxToTime(e.clientX - startX);
//     if (dragMode === DragMode.None) {
//         return
//     } else if (dragMode === DragMode.Resize) {
//     } else if (dragMode === DragMode.Move) {
//         // horizontal
//         if(select.selectedNotes.length) {
//             select.selectedNotes.forEach(({note})=>{
//                 note.start = startNoteStart + timeDelta;
//             })
//         } else {
//             noteBeingEdited.start = startNoteStart + timeDelta;
//         }
//         // vertical
//         // prevent pitch change if 'alt' key is pressed
//         // TODO: should draw a horizontal line to represent the constraint of movement.
//         if (e.altKey) return;
//         const octaveDelta = view.pxToOctave(e.clientY - startY);
//         let targetOctave = startNoteOctave + octaveDelta;
//         const visibleNotes = getVisibleNotes().filter(n => n !== noteBeingEdited);
//         const {
//             note
//         } = tool.snap(
//             noteBeingEdited,
//             targetOctave,
//             visibleNotes
//         );
//         noteBeingEdited.octave = note.octave;
//     }

// };
// const mouseUpListener = (e: MouseEvent) => {
//     dragMode = DragMode.None;
//     // common
//     let $noteBody = getNoteBody();
//     // horizontal
//     e.stopPropagation();
//     $noteBody.style.cursor = 'grab';
//     //vertical
// }

const bodyMouseEnterListener = (e: MouseEvent) => {
    edit.noteMouseEnter(props.editNote);
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    edit.noteMouseLeave();
}
const rightEdgeMOuseEnterListener = (e: MouseEvent) => {
    edit.noteRightEdgeMouseEnter(props.editNote);
}
const rightEdgeMouseLeaveListener = (e: MouseEvent) => {
    edit.noteRightEdgeMouseLeave();
}
onMounted(() => {
    const $rightEdge = getRightEdgeBody();
    const $noteBody = getNoteBody();
    // $noteBody.addEventListener('mousedown', mouseDownListener);
    // $rightEdge.addEventListener('mousedown', rightEdgeMouseDownListener);
    // window.addEventListener('mousemove', mouseMoveListener);
    // window.addEventListener('mouseup', mouseUpListener);
    $noteBody.addEventListener('mouseenter', bodyMouseEnterListener);
    $noteBody.addEventListener('mouseleave', bodyMouseLeaveListener);
    $rightEdge.addEventListener('mouseenter', rightEdgeMOuseEnterListener);
    $rightEdge.addEventListener('mouseleave', rightEdgeMouseLeaveListener);
});
onUnmounted(() => {
    const $rightEdge = getRightEdgeBody();
    const $noteBody = getNoteBody();
    // $noteBody.removeEventListener('mousedown', mouseDownListener);
    // $rightEdge.removeEventListener('mousedown', rightEdgeMouseDownListener);
    // window.removeEventListener('mousemove', mouseMoveListener);
    // window.removeEventListener('mouseup', mouseUpListener);
    $noteBody.removeEventListener('mouseenter', bodyMouseEnterListener);
    $noteBody.removeEventListener('mouseleave', bodyMouseLeaveListener);
    $rightEdge.removeEventListener('mouseenter', rightEdgeMOuseEnterListener);
    $rightEdge.removeEventListener('mouseleave', rightEdgeMouseLeaveListener);
});
/**
 * <text :x="editNote.x" :y="editNote.y + 9" font-size="10">{{ weirdFloatToString(editNote.note.octave) }} Octs.</text>
    <text :x="editNote.x" :y="editNote.y + 23" font-size="10">{{ weirdFloatToString(editNote.note.frequency) }}
        Hz.</text>
    <text :x="editNote.x" :y="editNote.y + 37" font-size="10">{{ weirdFloatToString(editNote.note.start) }} Ts.</text>
    <text :x="editNote.x" :y="editNote.y + 51" font-size="10">{{ weirdFloatToString(editNote.note.duration) }}
        Ts.</text>
*/
</script>
<template>
    <text 
        :x="editNote.x" 
        :y="editNote.y + 9" 
        font-size="10"
    >
        {{ editNote.selected }}, {{ select.isEditNoteSelected(editNote) }}
    </text>
    <rect 
        class="body" 
        :class="{ 
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
        }" 
        :...=editNote.rect
        ref="noteBody" 
    />
    <rect class="rightEdge" 
        :class="{ 
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
        }" 
        ref="rightEdge" 
        :...=editNote.rightEdge
    />
</template>
<style scoped>
.body {
    stroke: #999;
    cursor: move;
    fill:#0001;
}
.body.selected{
    fill: #f889;
}
.body.editable {
    fill: #888a;
}
.body.selected.body.editable{
    fill: #f88f;
}
.rightEdge.editable {
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
