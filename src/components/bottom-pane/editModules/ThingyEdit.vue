<script setup lang="ts">

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ParamType } from '../../../synth/interfaces/SynthParam';
import { ThingyScoreFx } from '../../../synth/scoreEffects/Thingy';
import Knob from '../components/Knob.vue';
import { on } from 'events';

const props = defineProps<{
    audioModule: ThingyScoreFx
}>();

type microVec = [number, number];
const canvasSize: microVec = [200, 200];
const canvas = ref<HTMLCanvasElement | null>(null);
const vecs = ref<microVec[]>([]);
const wave = ref<number[]>([]);
const inherentFreq = ref(Infinity);
let centroid = {
    value: [0, 0],
    recalc() {
        const sum = vecs.value.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
        this.value = [sum[0] / vecs.value.length, sum[1] / vecs.value.length];
        return this.value;
    }
};
let isDragging = false;
const maxVec = 1000;
const recalcWave = () => {
    const [cx, cy] = centroid.recalc();
    
        const lastIndex = vecs.value.length - 1;
        const ref = Math.hypot(vecs.value[lastIndex][0] - cx, vecs.value[lastIndex][1] - cy);
        ref;

    let range = 0;
    wave.value = vecs.value.map(([x, y], i) => {
        const theta = Math.atan2(y - cy, x - cx);
        const radialCenter = [cx + Math.cos(theta) * ref, cy + Math.sin(theta) * ref];
        const dist = Math.hypot(radialCenter[0] - x, radialCenter[1] - y);
        range = Math.max(range, dist);
        return dist;
    });
    wave.value = wave.value.map(v => 0.5 - v / range);
}
let context = computed(() => canvas.value?.getContext('2d'));
const canvasMouseMove = (e: MouseEvent) => {
    if (!canvas.value) return;
    if (isDragging && e.target === canvas.value) {
        const x = e.offsetX;
        const y = e.offsetY;
        vecs.value.push([x, y]);
        while (vecs.value.length > maxVec) {
            vecs.value.shift();
        }
        draw();
        recalcWave();
        if (wave.value.length > 3) props.audioModule.setWave(wave.value);
        inherentFreq.value = props.audioModule.inherentFrequency;

    }
}
const canvasMouseDown = (e: MouseEvent) => {
    if (!canvas.value) return;
    isDragging = true;
    vecs.value = [];
    addEventListener('mousemove', canvasMouseMove);
}

const windowMouseUp = (e: MouseEvent) => {
    isDragging = false;
    removeEventListener('mousemove', canvasMouseMove);
}

const getWaveValueAt = (iMin: number, iMax: number) => {
    if (iMax >= wave.value.length) iMax = wave.value.length - 1;
    if (iMax > iMin + 1) {
        let max = -1;
        let min = 1;
        let startIndex = Math.floor(iMin);
        let endIndex = Math.ceil(iMax);
        for (let j = startIndex; j <= endIndex; j++) {
            const vs = wave.value[j];
            max = Math.max(max, vs);
            min = Math.min(min, vs);
        }
        return [min, max];
    } else {
        const vs = wave.value[Math.floor(iMin)];
        return [vs, vs];
    }
}
const draw = () => {
    if (!context.value) return;
    console.log('draw');
    const ctx = context.value;
    // ctx.clearRect(0, 0, ...canvasSize);
    ctx.fillRect(0, 0, ...canvasSize);
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    for (let i = 0; i < vecs.value.length; i++) {
        const [x, y] = vecs.value[i];
        ctx[i ? 'lineTo' : 'moveTo'](x, y);
    }
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    const [cx, cy] = centroid.value;
    const radi = 4;
    ctx.strokeStyle = '#555555';
    const offsetY = canvasSize[1] / 2;
    ctx.ellipse(cx, cy, radi, radi, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(canvasSize[0], offsetY);
    ctx.stroke();
    const range = 1;
    ctx.beginPath();
    ctx.strokeStyle = '#ffF000';
    // iterate from zero to 1
    if(wave.value.length < canvasSize[0]){
        const scalex = canvasSize[0] / wave.value.length;
        for (let i = 0; i < wave.value.length; i++) {
            const x = i * scalex;
            const y = wave.value[i] * range * offsetY + offsetY;
            ctx[i ? 'lineTo' : 'moveTo'](x, y);
        }

    }else{
        const scalei = wave.value.length / canvasSize[0];
        for (let i = 0; i < canvasSize[0]; i++) {
            const [min, max] = getWaveValueAt(i * scalei, (i + 1) * scalei);
            ctx[i ? 'lineTo' : 'moveTo'](i, min * range * offsetY + offsetY);
            ctx.lineTo(i, max * range * offsetY + offsetY);
        }
    }
    ctx.stroke();

}

onMounted(() => {
    addEventListener('mouseup', windowMouseUp);
    addEventListener('mousedown', canvasMouseDown);
    draw();
});

onBeforeUnmount(() => {
    removeEventListener('mouseup', windowMouseUp);
    removeEventListener('mousedown', canvasMouseDown);
});

</script>
<template>
    <div style="display: flex;flex-direction: column; align-items: center;">
        <canvas ref="canvas" :width="canvasSize[0]" :height="canvasSize[1]"></canvas>
        <div class="readout">
            <p>inherent frequency: {{ inherentFreq.toFixed(3) }}</p>
        </div>
    </div>
</template>
<style scoped>
.readout {
    display: block;
    width: 200px;
}
.readout p {
    margin: 0;
    display: block;
    position: relative;
    width: 100%;
}

</style>