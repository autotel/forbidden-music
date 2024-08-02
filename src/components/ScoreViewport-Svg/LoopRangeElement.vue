<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Loop } from '../../dataTypes/Loop';
import { Tool } from '../../dataTypes/Tool';
import { useProjectStore } from '../../store/projectStore';
import { useToolStore } from '../../store/toolStore';
import { TimelineDot, TimelineRect, useViewStore } from '../../store/viewStore';
import SvgLittleButton from './SvgLittleButton.vue';
import { usePlaybackStore } from '@/store/playbackStore';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    eventRect: TimelineRect<Loop>
    interactionDisabled?: boolean,
    greyed?: boolean,
}>();
const project = useProjectStore();
const playback = usePlaybackStore();
const noteBody = ref<SVGRectElement>();
const rightDragHandle = ref<SVGRectElement>();
const leftDragHandle = ref<SVGRectElement>();

const bodyMouseEnterListener = (e: MouseEvent) => {
    tool.timelineItemMouseEnter(props.eventRect.event);
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    tool.timelineItemMouseLeave();
}

const rightDragHandleMouseEnterListener = (e: MouseEvent) => {
    tool.timelineItemRightEdgeMouseEnter(props.eventRect.event);
}
const rightDragHandleMouseLeaveListener = (e: MouseEvent) => {
    tool.timelineItemRightEdgeMouseLeave();
}
const leftDragHandleMouseEnterListener = (e: MouseEvent) => {
    tool.timelineItemLeftEdgeMouseEnter(props.eventRect.event);
}
const leftDragHandleMouseLeaveListener = (e: MouseEvent) => {
    tool.timelineItemLeftEdgeMouseLeave();
}

const playme = () => {
    console.log("jump here");
    // playback.timeReturnPoint = props.eventRect.event.time;
    playback.pause();
    playback.currentScoreTime = props.eventRect.event.time;
    playback.play();
}

watch(rightDragHandle, (newVal, oldVal) => {
    if (oldVal) {
        oldVal.removeEventListener('mouseenter', rightDragHandleMouseEnterListener);
        oldVal.removeEventListener('mouseleave', rightDragHandleMouseLeaveListener);
    }
    if (newVal) {
        newVal.addEventListener('mouseenter', rightDragHandleMouseEnterListener);
        newVal.addEventListener('mouseleave', rightDragHandleMouseLeaveListener);
    }
})

watch(leftDragHandle, (newVal, oldVal) => {
    if (oldVal) {
        oldVal.removeEventListener('mouseenter', leftDragHandleMouseEnterListener);
        oldVal.removeEventListener('mouseleave', leftDragHandleMouseLeaveListener);
    }
    if (newVal) {
        newVal.addEventListener('mouseenter', leftDragHandleMouseEnterListener);
        newVal.addEventListener('mouseleave', leftDragHandleMouseLeaveListener);
    }
})
onMounted(() => {
    if (props.interactionDisabled) return;
    if (noteBody.value) {
        noteBody.value.addEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.addEventListener('mouseleave', bodyMouseLeaveListener);
    }
});
onUnmounted(() => {
    if (props.interactionDisabled) return;
    if (noteBody.value) {
        noteBody.value.removeEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.removeEventListener('mouseleave', bodyMouseLeaveListener);
    }
});

const showButtons = computed(() => {
    return tool.current === Tool.Loop || props.eventRect.event.selected;
})

const grid = 22;
const margin = 12;
const marginy = 23;
const grdx = (pos: number) => {
    if (pos >= 0) return props.eventRect.x + pos * grid + margin
    return props.eventRect.x + props.eventRect.width + pos * grid - margin
}
const grdy = (pos: number) => {
    return 0 + pos * grid + marginy
}
</script>
<template>
    <g ref="noteBody">
        <rect class="body" v-bind="$attrs" :class="{
            selected: eventRect.event.selected,
            greyed: greyed,
        }" :x="eventRect.x" :y="0" :width=eventRect.width :height="eventRect.height" />
        <template v-if="!interactionDisabled && eventRect.rightEdge && !greyed">
            <rect ref="rightDragHandle" class="right edge-handle" :class="{
                greyed: greyed
            }" :x="eventRect.rightEdge.x" :y="0" :width="view.rightEdgeWidth" :height="eventRect.height" />
            <rect ref="leftDragHandle" class="left edge-handle" :class="{
                greyed: greyed
            }" :x="eventRect.x" :y="0" :width="view.rightEdgeWidth" :height="eventRect.height" />
        </template>
        <line v-if="interactionDisabled" :x1="eventRect.x" :y1="0" :x2="eventRect.x" :y2="view.viewHeightPx"
            stroke="currentColor" stroke-width="1" />

        <SvgLittleButton :x="grdx(0)" :y="grdy(0)" :onClick="() => playme()" tooltip="jump to this loop">
            ▶
        </SvgLittleButton>
        <template v-if="!props.interactionDisabled && showButtons">
            <SvgLittleButton :x="grdx(1)" :y="grdy(0)" :onClick="() => eventRect.event.count--"
                tooltip="less repetitions"> -
            </SvgLittleButton>
            <SvgLittleButton :x="grdx(2)" :y="grdy(0)" :onClick="() => eventRect.event.count++"
                tooltip="more repetitions"> +
            </SvgLittleButton>
            <SvgLittleButton :x="grdx(1)" :y="grdy(1)" :onClick="() => eventRect.event.count = 0"
                tooltip="disable loop">
                ∅
            </SvgLittleButton>
            <SvgLittleButton :x="grdx(2)" :y="grdy(1)" :onClick="() => eventRect.event.count = Infinity"
                tooltip="infinite repetitions"> ∞ </SvgLittleButton>

        </template>

        <template v-if="!props.interactionDisabled">
            <SvgLittleButton :x="grdx(-1)" :y="30" :onClick="() => project.magicLoopDuplicator(eventRect.event)"
                tooltip="copy to the right"> ©
            </SvgLittleButton>
        </template>

        <text class="texts" :x="grdx(1)" :y="18" font-size="20" v-if="!interactionDisabled && eventRect.rightEdge">
            {{ eventRect.event.repetitionsLeft ? eventRect.event.repetitionsLeft + ' of ' : '' }}
            {{ eventRect.event.count }}
        </text>
    </g>
</template>