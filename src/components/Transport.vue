<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Tool } from '../dataTypes/Tool';
import { usePlaybackStore } from '../store/playbackStore';
import { useViewStore } from '../store/viewStore';
import { SawtoothSynth } from '../synth/SawtoothSynth';
import Button from './Button.vue';

const view = useViewStore();
const playback = usePlaybackStore();
const bpmSetter = ref<HTMLInputElement>();
const barSkip = (e: MouseEvent) => {
    if(e.buttons===1){
        const leftPx = e.offsetX;
        const time = view.pxToTimeWithOffset(leftPx);
        playback.currentScoreTime = time;
    }
}

const preventWheelPropagation = (e: WheelEvent) => {
    e.stopPropagation();
}
onMounted(() => {
    if (!bpmSetter.value) throw new Error('bpmSetter is ' + bpmSetter.value);
    bpmSetter.value?.addEventListener('wheel', preventWheelPropagation);
});
onUnmounted(() => {
    bpmSetter.value?.removeEventListener('wheel', preventWheelPropagation);
});

</script>

<template>
    <div id="transport-controls">
        <svg id="skip-bar" @mousedown="barSkip" @drag="barSkip" @mousemove="barSkip">
            <line stroke-width="5" :x1="playback.playbarPxPosition" y1="0"
                :x2="playback.playbarPxPosition" y2="20" />
        </svg>
        <template v-if="playback.stopped || playback.paused">
            <Button :onClick="playback.play">
                <!-- play svg -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path d="M8 5v14l11-7z" />
                </svg>
            </Button>
        </template>
        <template v-else>
            <Button :onClick="playback.pause" :active="playback.paused">
                <!-- pause svg -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
            </Button>
        </template>
        <Button :onClick="playback.stop">
            <!-- stop svg -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path fill="none" d="M0 0h24v24H0z" />
                <path d="M6 6h12v12H6z" />
            </svg>
        </Button>
        <!-- input that sets the bpm -->
        <input id="bpm" type="number" v-model="playback.bpm" ref="bpmSetter" />
    </div>
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

#bpm {
    margin: 1px 1px;
    padding: 0.3em 0.6em;
    border: none;
    cursor: pointer;
    background-color: rgb(241, 241, 241);
    border: none;
    font-family: monospace;
    height: 1em;
    display: inline-block;
    position: relative;
    line-height: 0;
    font-size: 26px;
    width: 3em;
}

#bpm:active {
    border: none;

}

#bpm:hover {
    background-color: rgb(214, 214, 214);

}

#bpm.active {
    background-color: rgb(235, 210, 229);
}

#bpm.active:hover {
    background-color: rgb(179, 161, 174);
}

#bpm.danger:hover {
    background-color: rgb(255, 90, 49);
}
</style>
