<script setup lang="ts">

import { computed, onMounted, ref } from 'vue';
import { KickSynth } from '../../../synth/KickSynth';
import { ParamType } from '../../../synth/interfaces/SynthParam';
import Knob from '../components/Knob.vue';
import { useThrottleFn } from '@vueuse/core';

const props = defineProps<{
    audioModule: KickSynth
}>();


type microVec = [number, number];
const canvasSize: microVec = [300, 100];
const canvas = ref<HTMLCanvasElement | null>(null);

let context = computed(() => canvas.value?.getContext('2d'));

const getWaveValueAt = (iMin: number, iMax: number) => {
    const wave = props.audioModule.currentWave;
    if (iMax >= wave.length) iMax = wave.length - 1;
    if (iMax > iMin + 1) {
        let max = -1;
        let min = 1;
        let startIndex = Math.floor(iMin);
        let endIndex = Math.ceil(iMax);
        for (let j = startIndex; j <= endIndex; j++) {
            const vs = wave[j];
            max = Math.max(max, vs);
            min = Math.min(min, vs);
        }
        return [min, max];
    } else {
        const vs = wave[Math.floor(iMin)];
        return [vs, vs];
    }
}
const draw = () => {
    if (!context.value) return;
    console.log('draw');
    const wave = props.audioModule.currentWave;
    const ctx = context.value;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ...canvasSize);
    const offsetY = canvasSize[1] / 2;
    const range = 1;
    ctx.beginPath();
    ctx.strokeStyle = '#FAD3FA';
    if (wave.length < canvasSize[0]) {
        const scalex = canvasSize[0] / wave.length;
        for (let i = 0; i < wave.length; i++) {
            const x = i * scalex;
            const y = wave[i] * range * offsetY + offsetY;
            ctx[i ? 'lineTo' : 'moveTo'](x, y);
        }
    } else {
        const scalei = wave.length / canvasSize[0];
        for (let i = 0; i < canvasSize[0]; i++) {
            const [min, max] = getWaveValueAt(i * scalei, (i + 1) * scalei);
            ctx[i ? 'lineTo' : 'moveTo'](i, min * range * offsetY + offsetY);
            ctx.lineTo(i, max * range * offsetY + offsetY);
        }
    }
    ctx.stroke();
    let canvasTimeSpan = wave.length / props.audioModule.currentBuffer.sampleRate;
    const linesAt = [0.0125, 0.25, 0.5, 1, 2, 4, props.audioModule.fDecayTime.value].filter(v => v < canvasTimeSpan);
    let timeScale = canvasSize[0] / canvasTimeSpan;

    ctx.strokeStyle = '#777777';
    ctx.fillStyle = '#777777';
    for (const lineAt of linesAt) {
        ctx.beginPath();
        ctx.moveTo(lineAt * timeScale, 0);
        ctx.lineTo(lineAt * timeScale, canvasSize[1]);
        ctx.stroke();
        ctx.fillText(lineAt.toPrecision(3) + 's', lineAt * timeScale + 5, 10);
    }
    // draw zero line
    ctx.beginPath();
    ctx.strokeStyle = '#777777';
    ctx.moveTo(0, offsetY);
    ctx.lineTo(canvasSize[0], offsetY);
    ctx.stroke();

}
const paramChangedListener = useThrottleFn(() => {
    draw();
}, 20);

onMounted(() => {
    draw();
});

</script>
<template>
    <div style="text-align: center;">
        <canvas ref="canvas" :width="canvasSize[0]" :height="canvasSize[1]" style="flex-grow: 0; flex-shrink: 0;"></canvas>
        <div style="display: flex; flex-direction: row; margin-top:1em; flex-wrap: wrap; width: 20em; align-items: center;">
            <template v-for="param in audioModule.params">
                <Knob v-if="param.type === ParamType.number" :param="param" @update="paramChangedListener" />
            </template>
        </div>
    </div>
</template>