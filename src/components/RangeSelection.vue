<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Tool } from '../dataTypes/Tool';
import { useSelectStore } from '../store/selectStore'
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
const selection = useSelectStore();
const view = useViewStore();
const selectRange = ref({
    timeStart: 0,
    timeSize: 0,
    octaveStart: 0,
    octaveSize: 0,
    active: false
});
const tool = useToolStore();



const mouseDown = (e: MouseEvent) => {
    if (tool.current !== Tool.Select) return;
    const x = e.clientX;
    const y = e.clientY;
    selectRange.value.timeStart = view.pxToTimeWithOffset(x);
    selectRange.value.octaveStart = view.pxToOctaveWithOffset(y);
    selectRange.value.active = true;
}
const mouseMove = (e: MouseEvent) => {
    if (tool.current !== Tool.Select) return;
    if (selectRange.value.active) {
        const x = e.clientX;
        const y = e.clientY;
        selectRange.value.timeSize = view.pxToTimeWithOffset(x) - selectRange.value.timeStart;
        selectRange.value.octaveSize = view.pxToOctaveWithOffset(y) - selectRange.value.octaveStart;
    }
}
const mouseUp = (e: MouseEvent) => {
    if (tool.current !== Tool.Select) return;
    if (selectRange.value.active) {
        const x = e.clientX;
        const y = e.clientY;
        selectRange.value.timeSize = view.pxToTime(x) - selectRange.value.timeStart;
        selectRange.value.octaveSize = view.pxToOctave(y) - selectRange.value.octaveStart;
        const range = {
            startTime: selectRange.value.timeStart,
            endTime: selectRange.value.timeStart + selectRange.value.timeSize,
            startOctave: selectRange.value.octaveStart,
            endOctave: selectRange.value.octaveStart + selectRange.value.octaveSize
        }
        selection.selectRange(range);
        selectRange.value.active = false;
    }
}


onMounted(() => {
    window.addEventListener('mousedown', mouseDown);
    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('mouseup', mouseUp);

});
onUnmounted(() => {
    window.removeEventListener('mousedown', mouseDown);
    window.removeEventListener('mousemove', mouseMove);
    window.removeEventListener('mouseup', mouseUp);
});
</script>
<template>
    <rect v-if="selectRange.active" :x="view.timeToPxWithOffset(selectRange.timeStart)"
        :y="view.octaveToPxWithOffset(selectRange.octaveStart)" :width="view.timeToPx(selectRange.timeSize)"
        :height="view.octaveToPx(selectRange.octaveSize)" />
</template>
<style scoped>
rect {
    fill: rgba(161, 154, 143, 0.1);
    stroke: rgba(189, 192, 192, 0.5);
    stroke-width: 1;
    stroke-dasharray: 5px;
}
</style>