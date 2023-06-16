<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
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

const heightInOctaves = 1 / 12;
const halfHeightInOctaves = heightInOctaves / 2;

const positions = reactive({
    x: 0, y: 0, width: 0, height: 0, rightEdgeX: 0, rightEdgeWidth: 0
});

watch(() => props.editNote, () => {
    const x = view.timeToPxWithOffset(props.editNote.start);
    const width = props.editNote.duration ? view.timeToPx(props.editNote.duration) : 0;
    Object.assign(positions, {
        x,
        y: view.octaveToPxWithOffset(props.editNote.octave - halfHeightInOctaves),
        width,
        height: Math.abs(view.octaveToPx(heightInOctaves)),
        rightEdgeX: x + width - 5,
        rightEdgeWidth: props.editNote.selected ? 10 : 5,
    });
}, { 
    immediate: true,
    // deep: true,
    flush: 'post',
 });


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
    <text class="texts" v-if="view.viewWidthTime < 10" :x="positions.x" :y="positions.y + 5" font-size="10">
        (2^{{ editNote.octave.toFixed(3) }})n = {{ editNote.frequency.toFixed(3) }} hz {{ editNote.udpateFlag }}
    </text>
    <template v-if="editNote.duration">
        <rect class="body" :class="{
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
            interactionDisabled: interactionDisabled,
            muted: editNote.mute,
        }" :x="positions.x" :y="positions.y" :width="positions.width" :height="positions.height" :data-key="editNote.udpateFlag"
            :style="{ opacity: editNote.velocity + 0.5 }" ref="noteBody" />
        <rect v-if="!interactionDisabled" class="rightEdge" :class="{
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
            interactionDisabled: interactionDisabled,
        }" ref="rightEdge" :x="positions.rightEdgeX" :y="positions.y" :width="positions.rightEdgeWidth" :height="positions.height"
            :data-key="editNote.udpateFlag" :style="{ opacity: editNote.velocity }" />
    </template>
    <template v-else>
        <circle class="body" :class="{
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
            muted: editNote.mute,
            interactionDisabled: interactionDisabled,
        }" :cx="positions.x" :cy="positions.y" :r="positions.height / 2" ref="noteBody" />
    </template>
    <template v-if="tool.current === Tool.Modulation">
        <line :x1="positions.x" :y1="view.viewHeightPx - view.velocityToPx(editNote.velocity)" :x2="positions.x" :y2="view.viewHeightPx"
            class="veloline" :class="{
                selected: editNote.selected,
                muted: editNote.mute,
                interactionDisabled: interactionDisabled,
            }" />
        <circle :cx="positions.x" :cy="view.viewHeightPx - view.velocityToPx(editNote.velocity)" r="3" fill="black" />

    </template>
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
    opacity: 0.4 !important;
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

.body:hover {
    opacity: 1 !important
}
</style>
