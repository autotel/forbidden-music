<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { usePlaybackStore } from '../store/playbackStore';
import { useViewStore } from '../store/viewStore';
import Button from './Button.vue';

const view = useViewStore();
const playback = usePlaybackStore();
const bpmSetter = ref<HTMLInputElement>();
const jumpVal = ref(4);
const jump = (steps: number) => {
    playback.currentScoreTime += steps;
    playback.timeReturnPoint = playback.currentScoreTime;
    playback.resetLoopRepetitions();
    playback.catchUpAutomations(playback.currentScoreTime);
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
        <template v-if="playback.stopped || playback.paused">
            <Button :onClick="playback.play">
                <!-- play svg -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path fill="none" stroke="none" d="M0 0h24v24H0z" />
                    <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
            </Button>
        </template>
        <template v-else>
            <Button :onClick="playback.pause" :active="playback.paused">
                <!-- pause svg -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path fill="none" stroke="none" d="M0 0h24v24H0z" />
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor" />
                </svg>
            </Button>
        </template>
        <Button :onClick="playback.stop">
            <!-- stop svg -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path fill="none" stroke="none" d="M0 0h24v24H0z" />
                <path d="M6 6h12v12H6z" fill="currentColor" />
            </svg>
        </Button>
        <!-- input that sets the bpm -->
        <input id="bpm" type="number" v-model="playback.bpm" ref="bpmSetter" />
        <Button :active="view.followPlayback" :onClick="() => view.followPlayback = !view.followPlayback"
            tooltip="Follow playback: Keep moving the view to keep the current notes time at the center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <text x="0" y="19" font-size="24px" fill="currentColor">
                    ⇹
                </text>
            </svg>
        </Button>
        <!-- jump buttons -->
        <div class="skip-group">
            <Button :onClick="() => jump(-jumpVal)" tooltip="Jump back">
                &lt;&lt;
            </Button>
            <input type="number" v-model="jumpVal" style="width:2em; font-size: 1.2em; text-align: center;" />
            <Button :onClick="() => jump(jumpVal)" tooltip="Jump forward">
                &gt;&gt;
            </Button>
        </div>

    </div>
</template>
<style scoped>
#transport-controls {
    bottom: 0;
    display: flex;
    position: relative;
    align-items: center;
    flex-wrap: wrap;
}

#transport-controls>* {
    height: 2.6rem;
    display: block;
    box-sizing: border-box;
}

#bpm {
    margin: 1px 1px;
    padding: 0.3em 0.6em;
    border: none;
    cursor: pointer;
    /* background-color: rgb(241, 241, 241); */
    border: none;
    font-family: monospace;
    display: inline-block;
    position: relative;
    line-height: 0;
    font-size: 26px;
    width: 4em;


}

#transport-controls>.skip-group {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    height: 2em;
    border: solid 1px #b6b6b6;
    border-radius: 0.7em;
    margin-left: 1em;
}

.skip-group>* {
    height: 100%;
    border-radius: 0;
    display: block;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

/* Firefox */
input[type=number] {
    -moz-appearance: textfield;
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
