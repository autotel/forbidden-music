<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Tool } from '../../dataTypes/Tool';
import { useToolStore } from '../../store/toolStore';
import { TimelineItemRect, useViewStore } from '../../store/viewStore';
import { Loop } from '../../store/projectStore';
import SvgLittleButton from './SvgLittleButton.vue';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    eventRect: TimelineItemRect<Loop>
    interactionDisabled?: boolean
}>();

const itmHeight = computed(() => {
    return tool.current === Tool.Loop ? view.viewHeightPx : 50
})

const noteBody = ref<SVGRectElement>();
const lengthHandle = ref<SVGRectElement>();

const bodyMouseEnterListener = (e: MouseEvent) => {
    tool.timelineItemMouseEnter(props.eventRect.event);
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    tool.timelineItemMouseLeave();
}

const lengthHandleMouseEnterListener = (e: MouseEvent) => {
    tool.timelineItemRightEdgeMouseEnter(props.eventRect.event);
}
const lengthHandleMouseLeaveListener = (e: MouseEvent) => {
    tool.timelineItemRightEdgeMouseLeave();
}

watch(lengthHandle, (newVal, oldVal) => {
    if (oldVal) {
        oldVal.removeEventListener('mouseenter', lengthHandleMouseEnterListener);
        oldVal.removeEventListener('mouseleave', lengthHandleMouseLeaveListener);
    }
    if (newVal) {
        newVal.addEventListener('mouseenter', lengthHandleMouseEnterListener);
        newVal.addEventListener('mouseleave', lengthHandleMouseLeaveListener);
    }
})

onMounted(() => {
    if (noteBody.value) {
        noteBody.value.addEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.addEventListener('mouseleave', bodyMouseLeaveListener);
    }
});
onUnmounted(() => {
    if (noteBody.value) {
        noteBody.value.removeEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.removeEventListener('mouseleave', bodyMouseLeaveListener);
    }
});

const isEditable = computed(() => {
    return tool.current == Tool.Loop;
})
</script>
<template>
    <g ref="noteBody">
        <text class="texts" :x="eventRect.x + 10" :y="18" font-size="20">
            {{ eventRect.event.repetitionsLeft ? eventRect.event.repetitionsLeft + ' of ' : '' }}
            {{ eventRect.event.count }}
        </text>
        <rect class="body" v-bind="$attrs" :class="{
            editable: isEditable,
        }" :x="eventRect.x" :y="0" :width=eventRect.width :height="itmHeight" />
        <rect ref="lengthHandle" v-if="eventRect.rightEdge && isEditable" class="lengthHandle" :class="{
            editable: isEditable,
        }" :x="eventRect.rightEdge.x" :y="0" :width="view.rightEdgeWidth" :height="itmHeight" />
        <SvgLittleButton 
            v-if="isEditable" 
            :x="eventRect.x + 5" 
            :y="30"
            :onClick="() => eventRect.event.count--" 
        > - </SvgLittleButton>
        <SvgLittleButton 
            v-if="isEditable" 
            :x="eventRect.x + 25" 
            :y="30"
            :onClick="() => eventRect.event.count++" 
        > + </SvgLittleButton>
        <SvgLittleButton 
            v-if="isEditable" 
            :x="eventRect.x + 5" 
            :y="50"
            :onClick="() => eventRect.event.count = 0" 
        > 0 </SvgLittleButton>
        <SvgLittleButton 
            v-if="isEditable" 
            :x="eventRect.x + 25" 
            :y="50"
            :onClick="() => eventRect.event.count = Infinity" 
        > ∞ </SvgLittleButton>
    </g>
</template>
<style scoped>
.body {
    stroke: #5b009731;
    fill: rgba(22, 0, 150, 0.219);
    opacity: 0.3;
}

.body {
    /* fill: #888a; */
    opacity: 0.6;
}


.lengthHandle {
    fill: #f88a;
    stroke: none;
    opacity: 0.1;
}


.body:hover {
    opacity: 1 !important
}
</style>