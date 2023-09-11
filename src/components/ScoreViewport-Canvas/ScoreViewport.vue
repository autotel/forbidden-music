<script setup lang="ts">
import { Tool } from '../../dataTypes/Tool';
import { usePlaybackStore } from '../../store/playbackStore';
import { useProjectStore } from '../../store/projectStore';
import { useToolStore } from '../../store/toolStore';
import { useViewStore } from '../../store/viewStore';
import { onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';
const project = useProjectStore();
const tool = useToolStore();
const playback = usePlaybackStore();
const view = useViewStore();
const canvas = ref<HTMLCanvasElement>();

const props = defineProps<{
    width: number,
    height: number,
}>();


const start = () => {
    if (requestedAnimationFrame.value) {
        cancelAnimationFrame(requestedAnimationFrame.value);
    }
    const frame = () => {
        refreshView();
        requestedAnimationFrame.value = requestAnimationFrame(frame);
    };
    requestedAnimationFrame.value = requestAnimationFrame(frame);
}
const stop = () => {
    if (requestedAnimationFrame.value) {
        cancelAnimationFrame(requestedAnimationFrame.value);
    }
    requestedAnimationFrame.value = 0;
}

onMounted(() => {
    start();
})

onBeforeUnmount(() => {
    const $viewPort = canvas.value;
    if (!$viewPort) throw new Error("canvas not found");
    stop();
});

const refreshView = () => {
    console.log("refreshing view");
    const visibleNotes = view.visibleNoteRects;
    const playbackPxPosition = playback.playbarPxPosition;
    const ctx = canvas.value?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, props.width, props.height);
    ctx.fillStyle = "black";
    ctx.fillRect(playbackPxPosition, 0, 1, props.height);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (const note of visibleNotes) {
        if (note.width) {
            ctx.fillRect(note.x, note.y, note.width, note.height);
        } else {
            ctx.beginPath();
            ctx.arc(note.cx, note.cy, note.radius || 12, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    if (tool.selectRange.active) {
        const selRange = view.rangeToStrictRect(tool.selectRange);
        ctx.fillRect(selRange.x, selRange.y, selRange.width, selRange.height);
    }
}

const requestedAnimationFrame = ref<number>(0);


</script>
<template>
    <canvas ref="canvas" :width="width" :height="height" :class="tool.cursor">
    </canvas>
</template>