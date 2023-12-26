<script setup lang="ts">
import { computed } from 'vue';
import { AutomationPoint } from '../../dataTypes/AutomationPoint';
import { Tool } from '../../dataTypes/Tool';
import { useToolStore } from '../../store/toolStore';
import { TimelineDot, useViewStore } from '../../store/viewStore';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    circle: TimelineDot<AutomationPoint>
}>();

const getLine = () => {
    if (props.circle.event.value === 0) return view.viewHeightPx;
    return view.valueToPxWithOffset(props.circle.event.value);
}

const line = computed(getLine);


</script>
<template>
    <template v-if="tool.current === Tool.Modulation">
        <line :x1="circle.cx" :y1="line + 9" :x2="circle.cx" :y2="view.viewHeightPx" class="veloline" :class="{
            selected: circle.event.selected,
        }" />
        <circle :cx="circle.cx" :cy="line" r="7" :class="{
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
