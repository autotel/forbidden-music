<script setup lang="ts">
import { usePlaybackStore } from '@/store/playbackStore';
import { useSelectStore } from '@/store/selectStore';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { loop, Loop } from '../../dataTypes/Loop';
import { Tool } from '../../dataTypes/Tool';
import { useProjectStore } from '../../store/projectStore';
import { useToolStore } from '../../store/toolStore';
import { TimelineRect, useViewStore } from '../../store/viewStore';
import SvgLittleButton from './SvgLittleButton.vue';
import { useTimeRangeEdits } from '@/composables/useTimeRangeEdits';
import { useLoopsStore } from '@/store/loopsStore';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    eventRect: TimelineRect<Loop>
    interactionDisabled?: boolean,
    greyed?: boolean,
}>();
const project = useProjectStore();
const loops = useLoopsStore();
const playback = usePlaybackStore();
const selection = useSelectStore();
const loopBody = ref<SVGRectElement>();
const rightDragHandle = ref<SVGRectElement>();
const leftDragHandle = ref<SVGRectElement>();
const timeRangeEdits = useTimeRangeEdits();
const enqueued = ref<boolean>(false);
const magicLoopDuplicator = (sourceLoop: Loop) => {
    timeRangeEdits.duplicateTimeRange(sourceLoop);
}

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
    // playback.stop();
    // playback.currentScoreTime = props.eventRect.event.time;
    // playback.play();
    playback.enqueueLoop(props.eventRect.event);
    enqueued.value = true;
}

watch(()=>playback.loopToJumpTo, (newVal, oldVal) => {
    if (newVal === false) {
        enqueued.value = false;
    }
})

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
    if (loopBody.value) {
        loopBody.value.addEventListener('mouseenter', bodyMouseEnterListener);
        loopBody.value.addEventListener('mouseleave', bodyMouseLeaveListener);
    }
});
onUnmounted(() => {
    if (props.interactionDisabled) return;
    if (loopBody.value) {
        loopBody.value.removeEventListener('mouseenter', bodyMouseEnterListener);
        loopBody.value.removeEventListener('mouseleave', bodyMouseLeaveListener);
    }
});

const showButtons = computed(() => {
    return tool.current === Tool.Loop || props.eventRect.event.selected;
})

const grid = 22;
const margin = 12;
const marginy = 0;
const grdx = (pos: number) => {
    if (pos >= 0) return props.eventRect.x + pos * grid + margin
    return props.eventRect.x + props.eventRect.width + pos * grid - margin
}
const grdy = (pos: number) => {
    return props.eventRect.y + pos * grid + marginy
}


</script>
<template>
    <g ref="loopBody" class="loop" :class="{ blink: enqueued }">

        <rect class="body" v-bind="$attrs" :class="{
            selected: eventRect.event.selected,
            greyed: greyed,
        }" :x="eventRect.x" :y="eventRect.y" :width=eventRect.width :height="eventRect.height" />
        <template v-if="!interactionDisabled && eventRect.rightEdge && !greyed">
            <rect ref="rightDragHandle" class="right edge-handle" :class="{
                greyed: greyed
            }" :x="eventRect.rightEdge.x" :y="eventRect.y" :width="view.rightEdgeWidth" :height="eventRect.height" />
            <rect ref="leftDragHandle" class="left edge-handle" :class="{
                greyed: greyed
            }" :x="eventRect.x" :y="eventRect.y" :width="view.rightEdgeWidth" :height="eventRect.height" />
        </template>
        <line v-if="interactionDisabled" :x1="eventRect.x" :y1="eventRect.y" :x2="eventRect.x" :y2="view.viewHeightPx"
            stroke="currentColor" stroke-width="1" />
        <template v-if="eventRect.width > 200">

            <text class="texts" :x="grdx(3.4)" :y="eventRect.y + 18" font-size="20"
                v-if="!interactionDisabled && eventRect.rightEdge">
                {{ eventRect.event.repetitionsLeft ? eventRect.event.repetitionsLeft + ' of ' : '' }}
                {{ eventRect.event.count }}
                [{{ eventRect.event.dev_id }}]
            </text>
            
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
                <SvgLittleButton :x="grdx(1)" :y="grdy(1)" :onClick="() => {
                    eventRect.event.count = 0;
                    eventRect.event.repetitionsLeft = 0;
                }" tooltip="disable loop">
                    ∅
                </SvgLittleButton>
                <SvgLittleButton :x="grdx(2)" :y="grdy(1)" :onClick="() => {
                    eventRect.event.count = Infinity;
                    eventRect.event.repetitionsLeft = Infinity;
                }" tooltip="infinite repetitions"> ∞ </SvgLittleButton>

            </template>

            <template v-if="!props.interactionDisabled">
                <SvgLittleButton :x="grdx(-1)" :y="grdy(0)" :onClick="() => magicLoopDuplicator(eventRect.event)"
                    tooltip="copy to the right"> ©
                </SvgLittleButton>
                <SvgLittleButton :x="grdx(-2)" :y="grdy(0)" :onClick="() => selection.selectLoopAndNotes(eventRect.event)"
                    tooltip="select loop and contained notes"> [s]
                </SvgLittleButton>
            </template>
        </template>
    </g>
</template>
<style scoped>
.loop .body {
    fill: #11aacc55;
    stroke: #11aacc;
    stroke-width: 1;
}

.loop .selected {
    fill: #11aacc;
}

.loop .greyed {
    fill: #11aacc22;
}

.loop .edge-handle {
    fill: #11aacc;
    cursor: ew-resize;
}

.loop .texts {
    fill: #11aacc;
}

.blink {
    animation: blink 0.3s linear infinite;
}

@keyframes blink {
    0% {
        opacity: 0.3;
    }

    50% {
        opacity: 1;
    }

}
</style>