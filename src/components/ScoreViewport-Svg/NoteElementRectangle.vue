<script setup lang="ts">
import { ref, watch } from 'vue';
import { Note } from '../../dataTypes/Note';
import { useToolStore } from '../../store/toolStore';
import { TimelineRect, useViewStore } from '../../store/viewStore';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    eventRect: TimelineRect<Note>
    isEditable?: boolean,
    greyed?:boolean,
}>();

const rightEdge = ref<SVGElement>();

const rightEdgeMouseEnterListener = (e: MouseEvent) => {
    tool.timelineItemRightEdgeMouseEnter(props.eventRect.event);
}
const rightEdgeMouseLeaveListener = (e: MouseEvent) => {
    tool.timelineItemRightEdgeMouseLeave();
}

watch(rightEdge, (newVal, oldVal) => {
    if(oldVal) {
        oldVal.removeEventListener('mouseenter', rightEdgeMouseEnterListener);
        oldVal.removeEventListener('mouseleave', rightEdgeMouseLeaveListener);
    }
    if(newVal) {
        newVal.addEventListener('mouseenter', rightEdgeMouseEnterListener);
        newVal.addEventListener('mouseleave', rightEdgeMouseLeaveListener);
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
        v-if="eventRect.rightEdge && isEditable" class="length-handle" 
        :class="{
            selected: eventRect.event.selected,
            editable: isEditable,
        }" :...=eventRect.rightEdge :width="view.rightEdgeWidth" :height="eventRect.height" 
    />
</template>
