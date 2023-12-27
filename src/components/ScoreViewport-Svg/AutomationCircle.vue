<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { AutomationPoint } from '../../dataTypes/AutomationPoint';
import { Tool } from '../../dataTypes/Tool';
import { useToolStore } from '../../store/toolStore';
import { TimelineDot, useViewStore } from '../../store/viewStore';


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
        x1: circle.cx,
        y1: circle.cy,
        x2: 0,
        y2: 0,
    }
    if (nextCircle) {
        ret = {
            ...ret,
            x2: nextCircle.cx,
            y2: nextCircle.cy,
        }
    }
    return ret;
});
const textBits = computed(() => {
    const strno = '' + props.circle.event.value;
    const dotPosition = strno.indexOf('.');
    if (dotPosition === -1) {
        return [strno, ''];
    }
    const cutPosition = dotPosition + 3;
    return [strno.slice(0, cutPosition), strno.slice(cutPosition)];
});


const noteBody = ref<SVGCircleElement>();

const bodyMouseEnterListener = (e: MouseEvent) => {
    tool.timelineItemMouseEnter(props.circle.event);
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
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
    <template v-if="tool.current === Tool.Modulation">
        <text :x="xy1.x1" :y="xy1.y1" v-bind="$attrs">{{ textBits[0] }}</text>
        <text :x="xy1.x1 + 30" :y="xy1.y1" font-size="0.6em" v-bind="$attrs">{{ textBits[1] }}</text>

        <line v-if="nextCircle" v-bind="xy1" class="veloline" :class="{
            selected: circle.event.selected,
        }" />
        <circle ref="noteBody" :cx="xy1.x1" :cy="xy1.y1" r="7" :class="{
            selected: circle.event.selected,
        }" v-bind="$attrs" />
    </template>
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
    stroke-width: 3px;
}
</style>
