<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { Tool } from '../dataTypes/Tool';
import { useSelectStore } from '../store/selectStore';
import { useToolStore } from '../store/toolStore';

const tool = useToolStore();
const props = defineProps<{
    editNote: EditNote
    interactionDisabled?: boolean
}>();
// TODO: perhaps the dragging and moving procedures should be on a store, not on this component
const select = useSelectStore();
const noteBody = ref<SVGRectElement>();
const rightEdge = ref<SVGRectElement>();

enum DragMode {
    None,
    Move,
    Resize,
}

const myPos = reactive({
    x: 0,
    y: 0,
});

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

const bodyMouseEnterListener = (e: MouseEvent) => {
    tool.noteMouseEnter(props.editNote);
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    tool.noteMouseLeave();
}
const rightEdgeMOuseEnterListener = (e: MouseEvent) => {
    tool.noteRightEdgeMouseEnter(props.editNote);
}
const rightEdgeMouseLeaveListener = (e: MouseEvent) => {
    tool.noteRightEdgeMouseLeave();
}
onMounted(() => {
    if(props.interactionDisabled) return;
    const $rightEdge = getRightEdgeBody();
    const $noteBody = getNoteBody();
    $noteBody.addEventListener('mouseenter', bodyMouseEnterListener);
    $noteBody.addEventListener('mouseleave', bodyMouseLeaveListener);
    $rightEdge.addEventListener('mouseenter', rightEdgeMOuseEnterListener);
    $rightEdge.addEventListener('mouseleave', rightEdgeMouseLeaveListener);
});
onUnmounted(() => {
    if(props.interactionDisabled) return;
    const $rightEdge = getRightEdgeBody();
    const $noteBody = getNoteBody();
    $noteBody.removeEventListener('mouseenter', bodyMouseEnterListener);
    $noteBody.removeEventListener('mouseleave', bodyMouseLeaveListener);
    $rightEdge.removeEventListener('mouseenter', rightEdgeMOuseEnterListener);
    $rightEdge.removeEventListener('mouseleave', rightEdgeMouseLeaveListener);
});
</script>
<template>
    <text 
        :x="editNote.x" 
        :y="editNote.y + 9" 
        font-size="10"
    >
        {{ editNote.note.octave.toFixed(3) }} ({{ editNote.note.frequency.toFixed(3) }})
    </text>
    <rect 
        class="body" 
        :class="{ 
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
            interactionDisabled: interactionDisabled,
        }" 
        :...=editNote.rect
        ref="noteBody" 
    />
    <rect 
        v-if="!interactionDisabled"
        class="rightEdge" 
        :class="{ 
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
            interactionDisabled: interactionDisabled,
        }" 
        ref="rightEdge" 
        :...=editNote.rightEdge
        :data-key="editNote.udpateFlag"
    />
</template>
<style scoped>
.body {
    stroke: #999;
    fill:#0001;
}
.body.selected{
    fill: #f889;
}
.body.editable {
    fill: #888a;
}
.body.selected.body.editable{
    fill: rgba(255, 36, 36, 0.205);
}
.rightEdge.editable {
    fill: #f88a;
    stroke: #999;
}

.relation {
    stroke: #999;
    stroke-width: 1;
    stroke-dasharray: 5;
}
.body.interactionDisabled {
    pointer-events: none;
    fill:none;
}
</style>
