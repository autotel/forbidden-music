<script setup lang="ts">

import { Ref, computed, inject, onMounted, ref } from 'vue';
import { useMonoModeInteraction } from '../../../store/monoModeInteraction';
import { AudioModule } from '../../../synth/interfaces/AudioModule';
import { ParamType } from '../../../synth/interfaces/SynthParam';
import BooleanSynthParam from '../components/BooleanSynthParam.vue';
import NumberArraySynthParam from '../components/NumberArraySynthParam.vue';
import NumberSynthParam from '../components/NumberSynthParam.vue';
import OptionSynthParam from '../components/OptionSynthParam.vue';
import Button from '../../Button.vue';
import { useThrottleFn } from '@vueuse/core';
import { AutoMaximizerEffect } from '../../../synth/AutoMaximizerEffect';

const props = defineProps<{
    audioModule: AutoMaximizerEffect
}>();
const infoTextModal = inject<Ref<string>>('modalText');
const monoModeInteraction = useMonoModeInteraction();

const showInfo = (info: string) => {
    if (!infoTextModal) throw new Error('infoTextModal not injected');
    infoTextModal.value = info;
    monoModeInteraction.activate("credits modal");
}


type microVec = [number, number];
const canvasSize: microVec = [300, 100];
const canvas = ref<HTMLCanvasElement | null>(null);
let context = computed(() => canvas.value?.getContext('2d'));
// const width = canvasSize[0] + 'px';
const width = "60px";


const startRad = 12 * Math.PI / 180;
const radRange = Math.PI - startRad * 2;

const getWaveValueAt = (iMin: number, iMax: number, wave: number[]) => {
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
    const ctx = context.value;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ...canvasSize);
    const needleLevel = props.audioModule.getMeasuredLevel();
    const needleRad = startRad + radRange * needleLevel;
    const [cx, cy] = [canvasSize[0] / 2, canvasSize[1] / 2];
    ctx.beginPath();
    ctx.strokeStyle = '#FAD3FA';
    ctx.lineWidth = 2;
    ctx.moveTo(cx, canvasSize[1]);
    ctx.lineTo(cx + Math.cos(needleRad) * cy, canvasSize[1] - Math.sin(needleRad) * cy);
    ctx.stroke();
    console.log(needleLevel);
    const waveForm = props.audioModule.getWaveform();
    const waveLength = waveForm.length;
    ctx.beginPath();
    ctx.strokeStyle = '#FAD3FA';
    ctx.lineWidth = 1;
    const offsetY = canvasSize[1] / 2;
    const range = 1 / 255;
    // if (waveLength < canvasSize[0]) {
        const scalex = canvasSize[0] / waveLength;
        for (let i = 0; i < waveLength; i++) {
            const x = i * scalex;
            const y = waveForm[i] * range * offsetY + offsetY;
            ctx[i ? 'lineTo' : 'moveTo'](x, y);
        }
    // } else {
    //     const scalei = waveLength / canvasSize[0];
    //     for (let i = 0; i < canvasSize[0]; i++) {
    //         const [min, max] = getWaveValueAt(i * scalei, (i + 1) * scalei, waveForm);
    //         ctx[i ? 'lineTo' : 'moveTo'](i, min * range * offsetY + offsetY);
    //         ctx.lineTo(i, max * range * offsetY + offsetY);
    //     }
    // }

    requestAnimationFrame(draw);

}

onMounted(() => {
    draw();
});
</script>
<template>
    <div :style="{ width }" class="layout">
        <!-- <canvas ref="canvas" :width="canvasSize[0]" :height="canvasSize[1]" style="flex-grow: 0; flex-shrink: 0;"></canvas> -->

        <template v-for="param in audioModule.params">
            <NumberSynthParam v-if="param.type === ParamType.number" :param="param" />
            <BooleanSynthParam v-else-if="param.type === ParamType.boolean" :param="param" />
            <OptionSynthParam v-else-if="param.type === ParamType.option && param.options.length > 1" :param="param" />
            <NumberArraySynthParam v-else-if="param.type === ParamType.nArray" :param="param" />
        </template>
        <Button style="background-color: #ccc1;" v-if="audioModule.credits" @click="showInfo(audioModule.credits)"
            class="credits-button">Info</Button>
    </div>
</template>
<style scoped>
.layout {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: center;
    height: 100%;
}
</style>