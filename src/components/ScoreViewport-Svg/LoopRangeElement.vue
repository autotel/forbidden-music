<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Loop } from '../../dataTypes/Loop';
import { Tool } from '../../dataTypes/Tool';
import { useProjectStore } from '../../store/projectStore';
import { useToolStore } from '../../store/toolStore';
import { TimelineDot, TimelineRect, useViewStore } from '../../store/viewStore';
import SvgLittleButton from './SvgLittleButton.vue';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    eventRect: TimelineRect<Loop>
    interactionDisabled?: boolean,
    greyed?:boolean,
}>();
const project = useProjectStore();

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
</script>
<template>
    <g ref="noteBody">
        <rect class="body" v-bind="$attrs" :class="{
            selected: eventRect.event.selected,
            greyed: greyed,
        }" :x="eventRect.x" :y="0" :width=eventRect.width :height="eventRect.height" />

        <rect v-if="!interactionDisabled && eventRect.rightEdge && !greyed" ref="lengthHandle" class="length-handle"
            :class="{
                greyed: greyed
            }" :x="eventRect.rightEdge.x" :y="0" :width="view.rightEdgeWidth" :height="eventRect.height" />
        <line v-if="interactionDisabled" :x1="eventRect.x" :y1="0" :x2="eventRect.x" :y2="view.viewHeightPx" stroke="black"
            stroke-width="1" />

        <template v-if="!props.interactionDisabled && showButtons">
            <SvgLittleButton :x="eventRect.x + 5" :y="30" :onClick="() => eventRect.event.count--"
                tooltip="less repetitions"> -
            </SvgLittleButton>
            <SvgLittleButton :x="eventRect.x + 25" :y="30" :onClick="() => eventRect.event.count++"
                tooltip="more repetitions"> +
            </SvgLittleButton>
            <SvgLittleButton :x="eventRect.x + 5" :y="50" :onClick="() => eventRect.event.count = 0" tooltip="disable loop">
                ∅
            </SvgLittleButton>
            <SvgLittleButton :x="eventRect.x + 25" :y="50" :onClick="() => eventRect.event.count = Infinity"
                tooltip="infinite repetitions"> ∞ </SvgLittleButton>
        </template>
        <template v-if="!props.interactionDisabled">
        <SvgLittleButton :x="eventRect.x + eventRect.width - 25" :y="30"
            :onClick="() => project.magicLoopDuplicator(eventRect.event)" tooltip="copy to the right"> ©
        </SvgLittleButton>
        </template>

        <text class="texts" :x="eventRect.x + 10" :y="18" font-size="20"  v-if="!interactionDisabled && eventRect.rightEdge">
            {{ eventRect.event.repetitionsLeft ? eventRect.event.repetitionsLeft + ' of ' : '' }}
            {{ eventRect.event.count }}
        </text>
    </g>
</template>