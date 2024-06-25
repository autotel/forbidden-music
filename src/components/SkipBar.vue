<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { usePlaybackStore } from '../store/playbackStore';
import { useViewStore } from '../store/viewStore';
import Button from './Button.vue';

const view = useViewStore();
const playback = usePlaybackStore();
const barSkip = (e: MouseEvent) => {
    if(e.buttons===1){
        const leftPx = e.offsetX;
        const time = view.pxToTimeWithOffset(leftPx);
        playback.currentScoreTime = time;
        playback.timeReturnPoint = time;
        playback.resetLoopRepetitions();

        playback.catchUpAutomations(time);
    }
}

</script>

<template>
    <svg
        :style="{width:view.viewWidthPx+'px'}"
        id="skip-bar" @mousedown="barSkip" @drag="barSkip" @mousemove="barSkip">
        <line stroke-width="5" :x1="playback.playbarPxPosition" y1="0"
            :x2="playback.playbarPxPosition" y2="20" stroke="currentColor"/>
    </svg>
</template>
<style scoped>


#skip-bar {
    position: fixed;
    left: 0px;
    top: 0px;
    width: 100%;
    height: 1.5em;
    background: linear-gradient(#0000, #0005);
    cursor: pointer;
}

</style>
