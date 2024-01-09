<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { AutomationPoint, MinMax, automationRangeToParamRange } from '../../dataTypes/AutomationPoint';
import { Tool } from '../../dataTypes/Tool';
import { useToolStore } from '../../store/toolStore';
import { TimelineDot } from '../../store/viewStore';

const tool = useToolStore();
const props = defineProps<{
    circle: TimelineDot<AutomationPoint>
    nextCircle?: TimelineDot<AutomationPoint> | undefined
    interactionDisabled?: boolean
}>();
const xy1 = computed(() => {
    const circle = props.circle;
    const nextCircle = props.nextCircle;
    let ret = {
        x1: circle.x,
        y1: circle.y,
        x2: 0,
        y2: 0,
    }
    if (nextCircle) {
        ret = {
            ...ret,
            x2: nextCircle.x,
            y2: nextCircle.y,
        }
    }
    return ret;
});
const textBits = computed(() => {
    const show = tool.mouse.hovered?.trace === props.circle.event
        || props.circle.event.selected;
    if (!show) {
        return [];
    }
    if (!tool.laneBeingEdited) return []

    const targetParameter: MinMax = tool.laneBeingEdited?.targetParameter as MinMax;

    const mappedValue = automationRangeToParamRange(
        props.circle.event.value,
        targetParameter
    )
    const strno = '' + mappedValue;
    const dotPosition = strno.indexOf('.');
    if (dotPosition === -1) {
        return [strno, ''];
    }
    const cutPosition = dotPosition + 3;
    return [strno.slice(0, cutPosition), strno.slice(cutPosition)];
});

const noteBody = ref<SVGCircleElement>();

const bodyMouseEnterListener = (e: MouseEvent) => {
    console.log('bodyMouseEnterListener')
    tool.timelineItemMouseEnter(props.circle.event);
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    console.log('bodyMouseLeaveListener')
    tool.timelineItemMouseLeave();
}

onMounted(() => {
    if (props.interactionDisabled) return;
    if (noteBody.value) {
        noteBody.value.addEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.addEventListener('mouseleave', bodyMouseLeaveListener);
    }
});
onBeforeUnmount(() => {
    if (props.interactionDisabled) return;
    if (noteBody.value) {
        noteBody.value.removeEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.removeEventListener('mouseleave', bodyMouseLeaveListener);
    }
});


</script>
<template>
    <text :x="xy1.x1 + 15" :y="xy1.y1 + circle.radius" v-bind="$attrs">{{ textBits[0] }}</text>
    <text :x="xy1.x1 + 55" :y="xy1.y1 + circle.radius" font-size="0.6em" v-bind="$attrs">{{ textBits[1] }}</text>

    <line v-if="nextCircle" v-bind="xy1" class="veloline" />
    <circle ref="noteBody" :cx="xy1.x1" :cy="xy1.y1" r="7" :class="{
        selected: circle.event.selected,
    }" v-bind="$attrs" />
</template>
<style scoped>
line,
circle {
    stroke: rgba(253, 152, 0, 0.5);
    fill: #0000;
}


line.selected,
circle.selected {
    stroke: rgb(253, 152, 0);
    fill: rgba(253, 152, 0, 0.5);
    stroke-width: 3px;
}
</style>
