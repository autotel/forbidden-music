<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Tool } from '../dataTypes/Tool';
import { useToolStore } from '../store/toolStore';
import { useViewStore, NoteRect } from '../store/viewStore';
import { EditNote } from '../dataTypes/EditNote';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    event: EditNote
    selected: boolean
    x: number
    interactionDisabled?: boolean
}>();

const getVeloLine = () => {
    if (props.event.velocity === 0) return view.viewHeightPx;
    return view.velocityToPxWithOffset(props.event.velocity);
}

const myVeloLine = ref(getVeloLine());

const refreshLine = () => {
    if (props.interactionDisabled) return;
    if(props.selected){
        myVeloLine.value = getVeloLine();
    }
}

onMounted(() => {
    if (props.interactionDisabled) return;
    window.addEventListener('mousemove', refreshLine);
    window.addEventListener('scroll', refreshLine);
});
onUnmounted(() => {
    if (props.interactionDisabled) return;
    window.removeEventListener('mousemove', refreshLine);
    window.addEventListener('scroll', refreshLine);
});

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
        }" />
    </template>
</template>
<style scoped>

line, circle {
    stroke: rgba(0, 0, 0, 0.404);
    fill: #0000;
}


line.selected, circle.selected {
    stroke: #f889;
    stroke-width: 3px;
}
</style>
