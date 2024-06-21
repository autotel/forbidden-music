<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useSnapStore } from '../store/snapStore';
import Button from '../components/Button.vue';
import { useMonoModeInteraction } from '../store/monoModeInteraction';
import { useViewStore } from '../store/viewStore';
import Floaty from './Floaty.vue';
import { useSynthStore } from '../store/synthStore';
import { filterMap } from '../functions/filterMap';
import { useAudioContextStore } from '../store/audioContextStore';
import { getFrequency, note } from '../dataTypes/Note';
import { octaveToFrequency } from '../functions/toneConverters';
import { useProjectStore } from '../store/projectStore';
import { usePlaybackStore } from '../store/playbackStore';
import { useLayerStore } from '../store/layerStore';
import { useToolStore } from '../store/toolStore';
const snap = useSnapStore();
const view = useViewStore();
const synth = useSynthStore();

const audioContext = useAudioContextStore();
const running = ref(false);
const mouse = { x: 0, y: 0 };
let prevMouse = { ...mouse };
interface HarpString {
    pos: number;
    octave: number;
}
const recording = ref(false);
const height = ref(view.viewHeightPx);
const octaves = ref<HarpString[]>([]);
const mouseMoved = (e: MouseEvent) => {
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
}
const importFreqs = () => {
    const imported = snap.customOctavesTable.sort();
    octaves.value = imported.map((octave, i) => {
        const pos = (i + 0.5) / imported.length * floatyPos.width;
        return { pos, octave };
    });

}

const line = ref({ x1: 0, y1: 0, x2: 0, y2: 0 });
let lastTime = 0;
const project = useProjectStore();
const playback = usePlaybackStore();
const tool = useToolStore();
const mouseEntered = (e: MouseEvent) => {
    mouseMoved(e);
    prevMouse = { ...mouse };
    start();
}
const mouseLeft = (e: MouseEvent) => {
    stop();
}
const addEvent = (octave: number) => {
    const time = playback.currentScoreTime;
    const newEvent = note({
        time,
        duration: 0,
        velocity: 0.7,
        octave,
    });
    project.appendNote(newEvent);
}

// myModal.activate();
const frameFn = (time: number) => {
    if (!lastTime) lastTime = time;
    const deltaTime = time - lastTime;

    interface crossedOctave {
        octave: number,
        lerp: number,
    }
    const movementXPX = Math.abs(mouse.x - prevMouse.x);

    if (movementXPX > 0) {
        const octavesCrossed: crossedOctave[] = filterMap(octaves.value, octave => {
            const crossedA = prevMouse.x < octave.pos && mouse.x > octave.pos;
            const crossedB = prevMouse.x > octave.pos && mouse.x < octave.pos;
            if (crossedA || crossedB) {
                const lerp = Math.abs(octave.pos - prevMouse.x) / movementXPX;
                return { octave: octave.octave, lerp }
            }
            return false;
        })
        const timeNow = audioContext.audioContext.currentTime;
        if (octavesCrossed.length > 0) {
            octavesCrossed.forEach(({ octave, lerp }) => {
                const extra = (lerp * deltaTime / 1000000);
                const velocity = movementXPX / 70;

                if (isNaN(extra)) return;
                const noteReceivers = synth.getLayerSynths(tool.currentLayerNumber)
                noteReceivers.forEach(noteReceiver => {
                    noteReceiver.schedulePerc(
                        octaveToFrequency(octave),
                        timeNow + extra,
                        { velocity }
                    );
                });
                if (recording.value) {
                    addEvent(octave);
                }
            });
        }
    }
    line.value = { x1: mouse.x, y1: mouse.y, x2: prevMouse.x, y2: prevMouse.y };
    prevMouse = { ...mouse };

    if (running.value) requestAnimationFrame(frameFn);
}

const start = () => {
    running.value = true;
    requestAnimationFrame(frameFn);
}
const stop = () => {
    running.value = false;
}

onMounted(() => {
    importFreqs();
})

const floatyPos = {
    x: 0,
    y: 0,
    width: 500,
    height: 90
}

</script>
<template>
    <Floaty v-bind="floatyPos" :title="'Harp'" :onmouseenter="mouseEntered"
        @resize="(size)=>({...floatyPos, ...size})" @move="(pos)=>({...floatyPos, ...pos})" 
        :onmouseleave="mouseLeft">
        <svg v-on:mousemove="mouseMoved" style="width:100%; height:100%; border:solid 1px"
            xmlns="http://www.w3.org/2000/svg">
            <line v-for="octave in octaves" :x1="octave.pos" :y1="0" :x2="octave.pos" :y2="height" stroke="currentColor"
                stroke-width="2" />
            <line v-bind="line" stroke="red" stroke-width="2" />

        </svg>
        <Button @click="importFreqs">Import from frequencies table</Button>
        <Button v-if="running" @click="stop">Stop</Button>
        <Button v-else @click="start">Start</Button>
        <Button v-if="recording" @click="recording = false">XEC</Button>
        <Button v-else @click="recording = true">REC</Button>

    </Floaty>
</template>