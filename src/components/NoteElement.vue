<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { Tool } from '../dataTypes/Tool';
import { useSelectStore } from '../store/selectStore';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    editNote: EditNote
    interactionDisabled?: boolean
}>();

const noteBody = ref<SVGRectElement>();
const rightEdge = ref<SVGRectElement>();

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
    if (noteBody.value) {
        noteBody.value.addEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.addEventListener('mouseleave', bodyMouseLeaveListener);
    }
    if (rightEdge.value) {
        rightEdge.value.addEventListener('mouseenter', rightEdgeMOuseEnterListener);
        rightEdge.value.addEventListener('mouseleave', rightEdgeMouseLeaveListener);
    }
});
onUnmounted(() => {
    if (props.interactionDisabled) return;
    if (noteBody.value) {
        noteBody.value.removeEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.removeEventListener('mouseleave', bodyMouseLeaveListener);
    }
    if (rightEdge.value) {
        rightEdge.value.removeEventListener('mouseenter', rightEdgeMOuseEnterListener);
        rightEdge.value.removeEventListener('mouseleave', rightEdgeMouseLeaveListener);
    }
});
</script>
<template>
    <text class="texts" v-if="view.viewWidthTime < 10" :x="editNote.x" :y="editNote.y + 5" font-size="10">
        (2^{{ editNote.note.octave.toFixed(3) }})n = {{ editNote.note.frequency.toFixed(3) }} hz
    </text>
    <template v-if="editNote.note.duration">
        <rect class="body" :class="{
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
            interactionDisabled: interactionDisabled,
            muted: editNote.note.mute,
        }" :...=editNote.rect :style="{ opacity: editNote.note.velocity + 0.5 }" ref="noteBody" />
        <rect v-if="!interactionDisabled" class="rightEdge" :class="{
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
            interactionDisabled: interactionDisabled,
        }" ref="rightEdge" :...=editNote.rightEdge :data-key="editNote.udpateFlag"
            :style="{ opacity: editNote.note.velocity }" />
    </template>
    <template v-else>
        <circle class="body" :class="{
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
            muted: editNote.note.mute,
            interactionDisabled: interactionDisabled,
        }" ...=editNote.circle ref="noteBody" />
    </template>
    <!-- <template v-if="tool.current === Tool.Modulation && !editNote.note.mute">
        <line :x1="editNote.x" :y1="view.viewHeightPx - view.velocityToPx(editNote.note.velocity)" :x2="editNote.x"
            :y2="view.viewHeightPx" class="veloline" :class="{
                selected: editNote.selected,
                muted: editNote.note.mute,
                interactionDisabled: interactionDisabled,
            }" />
        <circle :cx="editNote.x" :cy="view.viewHeightPx - view.velocityToPx(editNote.note.velocity)" r="3" fill="black" />

    </template> -->
</template>
<style scoped>
.texts {
    pointer-events: none;
}

.body {
    stroke: #999;
    fill: #0001;
}

.veloline {
    stroke: #0001;
}

.body.selected {
    fill: #f889;
}

.veloline.selected {
    stroke: #f889;
}

.body.editable {
    fill: #888a;
}

.body.selected.body.editable {
    fill: rgba(255, 36, 36, 0.205);
}


.body.muted {
    opacity: 0.4!important;
    fill: rgba(81, 81, 158, 0.541);
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
    fill: #ccc4;
}

.body:hover{
    opacity:1 !important
}
</style>
