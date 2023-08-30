<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useToolStore } from '../../store/toolStore';
import { NoteRect, useViewStore } from '../../store/viewStore';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    eventRect: NoteRect
    isEditable?: boolean
}>();

const rightEdge = ref<SVGElement>();

const rightEdgeMouseEnterListener = (e: MouseEvent) => {
    tool.noteRightEdgeMouseEnter(props.eventRect.event);
}
const rightEdgeMouseLeaveListener = (e: MouseEvent) => {
    tool.noteRightEdgeMouseLeave();
}

onMounted(() => {
    if (rightEdge.value) {
        rightEdge.value.addEventListener('mouseenter', rightEdgeMouseEnterListener);
        rightEdge.value.addEventListener('mouseleave', rightEdgeMouseLeaveListener);
    }
});
onUnmounted(() => {
    if (rightEdge.value) {
        rightEdge.value.removeEventListener('mouseenter', rightEdgeMouseEnterListener);
        rightEdge.value.removeEventListener('mouseleave', rightEdgeMouseLeaveListener);
    }
});

</script>
<template>
    <rect
        class="body"
        v-bind="$attrs"
        :class="{
            selected: eventRect.event.selected,
            editable: isEditable,
            muted: eventRect.event.mute,
        }" :x="eventRect.x" :y="eventRect.y" :width="eventRect.width" :height="eventRect.height"
    />
    <rect  
        ref="rightEdge"
        v-if="eventRect.rightEdge && isEditable" class="rightEdge" 
        :class="{
            selected: eventRect.event.selected,
            editable: isEditable,
        }" :...=eventRect.rightEdge :width="view.rightEdgeWidth" :height="eventRect.height" 
    />
</template>
<style scoped>
.texts {
    pointer-events: none;
}


.body {
    stroke: #999;
    /* fill: #0001; */
    opacity: 0.3;
}

.body.selected {
    fill: #f889;
    stroke: #f889;
    opacity: 1;
}


.body.editable {
    /* fill: #888a; */
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

.body:hover {
    opacity: 1 !important
}
</style>
