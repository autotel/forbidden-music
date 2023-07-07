<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Tool } from '../dataTypes/Tool';
import { useToolStore } from '../store/toolStore';
import { useViewStore, NoteRect } from '../store/viewStore';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    eventRect: NoteRect
    interactionDisabled?: boolean
}>();

const noteBody = ref<SVGRectElement>();
const rightEdge = ref<SVGRectElement>();

const bodyMouseEnterListener = (e: MouseEvent) => {
    tool.noteMouseEnter(props.eventRect.event);
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    tool.noteMouseLeave();
}
const rightEdgeMOuseEnterListener = (e: MouseEvent) => {
    tool.noteRightEdgeMouseEnter(props.eventRect.event);
}
const rightEdgeMouseLeaveListener = (e: MouseEvent) => {
    tool.noteRightEdgeMouseLeave();
}

onMounted(() => {
    if (props.interactionDisabled) return;
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

const isEditable = () => {
    return tool.current == Tool.Edit && tool.currentlyActiveGroup === props.eventRect.event.group;
}
</script>
<template>
    <text class="texts" v-if="view.viewWidthTime < 10" :x="eventRect.x" :y="eventRect.cy + 5" font-size="10">
        (2^{{ 
            eventRect.event.octave.toFixed(3)
        }})n = {{ 
            eventRect.event.frequency.toFixed(3) 
        }} hz {{ 
            eventRect.event.group?.name 
        }}
    </text>
    <template v-if="eventRect.event.duration > 0">
        <rect class="body" :class="{
            selected: eventRect.event.selected,
            editable: isEditable(),
            interactionDisabled: interactionDisabled,
            muted: eventRect.event.mute,
        }" :x="eventRect.x" :y="eventRect.y" :width="eventRect.width" :height="eventRect.height" ref="noteBody" />
        <rect v-if="eventRect.rightEdge && !interactionDisabled" class="rightEdge" :class="{
            selected: eventRect.event.selected,
            editable: isEditable(),
            interactionDisabled: interactionDisabled,
        }" ref="rightEdge" :...=eventRect.rightEdge :width="eventRect.radius" :height="eventRect.height" />
    </template>
    <template v-else>
        <circle class="body" :class="{
            selected: eventRect.event.selected,
            editable: isEditable(),
            muted: eventRect.event.mute,
            interactionDisabled: interactionDisabled,
        }" :cx="eventRect.cx" :cy="eventRect.cy" :r="eventRect.radius" ref="noteBody" />
    </template>
    <template v-if="tool.current === Tool.Modulation">
        <line :x1="eventRect.x" :y1="view.viewHeightPx - view.velocityToPx(eventRect.event.velocity)" :x2="eventRect.x"
            :y2="view.viewHeightPx" class="veloline" :class="{
                selected: eventRect.event.selected,
                muted: eventRect.event.mute,
                interactionDisabled: interactionDisabled,
            }" />
        <circle :cx="eventRect.x" :cy="view.viewHeightPx - view.velocityToPx(eventRect.event.velocity)" r="3" fill="black" />

    </template>
</template>
<style scoped>
.texts {
    pointer-events: none;
}


.body {
    stroke: #999;
    fill: #0001;
    opacity: 0.3;
}

.veloline {
    stroke: #0001;
}

.body.selected {
    fill: #f889;
    stroke: #f889;
    opacity: 1;
}

.veloline.selected {
    stroke: #f889;
    stroke-width: 3px;
}

.body.editable {
    fill: #888a;
    opacity: 0.6;
}

.body.selected.editable {
    fill: rgba(255, 36, 36, 0.205);
}


.body.muted {
    fill: rgba(81, 81, 158, 0.541);
    stroke: #999;
}

.body.editable.muted.selected {
    fill: rgba(255, 36, 182, 0.068);
    stroke: #f889;
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
