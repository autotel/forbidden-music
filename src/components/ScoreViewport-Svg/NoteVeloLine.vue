<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue';
import { Note } from '../../dataTypes/Note';
import { Tool } from '../../dataTypes/Tool';
import { useToolStore } from '../../store/toolStore';
import { useViewStore } from '../../store/viewStore';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    event: Note
    selected: boolean
    x: number
    interactionDisabled?: boolean
}>();

const getVeloLine = () => {
    if (props.event.velocity === 0) return view.viewHeightPx;
    return view.velocityToPxWithOffset(props.event.velocity);
}

const myVeloLine = computed(getVeloLine);


</script>
<template>
    <template v-if="tool.current === Tool.Modulation">
        <line :x1="x" :y1="myVeloLine + 9" :x2="x" :y2="view.viewHeightPx" class="veloline" :class="{
            selected: event.selected,
            interactionDisabled: interactionDisabled,
        }" />
        <circle :cx="x" :cy="myVeloLine" r="7" :class="{
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

/** dark mode */
@media screen and (prefers-color-scheme: dark) {

    line,
    circle {
        stroke: rgba(255, 255, 255, 0.404);
        fill: #ffffff00;
    }


}
</style>
