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
    return view.viewHeightPx - view.velocityToPx(props.event.velocity);
}

const myVeloLine = ref(getVeloLine());

const mouseMoveListener = (e: MouseEvent) => {
    if (props.interactionDisabled) return;
    if(props.selected){
        myVeloLine.value = getVeloLine();
    }
}

onMounted(() => {
    if (props.interactionDisabled) return;
    window.addEventListener('mousemove', mouseMoveListener);
});
onUnmounted(() => {
    if (props.interactionDisabled) return;
    window.removeEventListener('mousemove', mouseMoveListener);
});

</script>
<template>
    <template v-if="tool.current === Tool.Modulation">
        <line :x1="x" :y1="myVeloLine" :x2="x" :y2="view.viewHeightPx" class="veloline" :class="{
            selected: event.selected,
            // muted: eventRect.event.mute,
            interactionDisabled: interactionDisabled,
        }" />
        <circle :cx="x" :cy="myVeloLine" r="3" fill="black" />
    </template>
</template>
<style scoped>

.veloline {
    stroke: #0001;
}


.veloline.selected {
    stroke: #f889;
    stroke-width: 3px;
}
</style>
