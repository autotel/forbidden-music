<script setup lang="ts">
import { computed } from 'vue';
import { AutomationPoint } from '../../dataTypes/AutomationPoint';
import { Tool } from '../../dataTypes/Tool';
import { useToolStore } from '../../store/toolStore';
import { useViewStore } from '../../store/viewStore';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    event: AutomationPoint
    selected: boolean
    x: number
    interactionDisabled?: boolean
}>();

const getLine = () => {
    if (props.event.value === 0) return view.viewHeightPx;
    return view.valueToPxWithOffset(props.event.value);
}

const line = computed(getLine);


</script>
<template>
    <template v-if="tool.current === Tool.Modulation">
        <line :x1="x" :y1="line + 9" :x2="x" :y2="view.viewHeightPx" class="veloline" :class="{
            selected: event.selected,
            interactionDisabled: interactionDisabled,
        }" />
        <circle :cx="x" :cy="line" r="7" :class="{
            selected: event.selected,
            interactionDisabled: interactionDisabled,
        }" v-bind="$attrs" />
    </template>
</template>
<style scoped>
line,
circle {
    stroke: rgba(0, 0, 0, 0.404);
    fill: #0000;
}


line.selected,
circle.selected {
    stroke: #f889;
    stroke-width: 3px;
}
</style>
