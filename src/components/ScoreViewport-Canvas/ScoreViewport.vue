<script setup lang="ts">
import { Tool } from '../../dataTypes/Tool';
import { usePlaybackStore } from '../../store/playbackStore';
import { useProjectStore } from '../../store/projectStore';
import { useToolStore } from '../../store/toolStore';
import { TimelineRect, useViewStore } from '../../store/viewStore';
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
    const visibleNotes = view.visibleNoteDrawables;
    const playbackPxPosition = playback.playbarPxPosition;
    const ctx = canvas.value?.getContext("2d");
    
    const perspNudge = (rect:TimelineRect) => {
        return  (rect.event.time - view.timeOffset ) * (1 - rect.event.velocity) * view.timeToPx(1);
    }

    if (!ctx) return;
    // ctx.clearRect(0, 0, props.width, props.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, props.width, props.height);
    ctx.fillStyle = "white";
    ctx.fillRect(playbackPxPosition, 0, 1, props.height);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const note of visibleNotes) {
        const pn = perspNudge(note);
        const sn = 1/(note.event.velocity * 6);
        if (note.width) {
            ctx.fillRect(note.x + pn, note.y, note.width * pn, note.height * sn);
        } else {
            ctx.beginPath();
            ctx.arc(note.cx + pn, note.cy, (note.radius || 12) * sn, 0, 2 * Math.PI);
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