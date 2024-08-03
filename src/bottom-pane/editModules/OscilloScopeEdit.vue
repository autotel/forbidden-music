<script setup lang="ts">

import { Ref, computed, inject, onMounted, ref } from 'vue';
import { useMonoModeInteraction } from '@/store/monoModeInteraction';
import { OscilloScope } from '@/synth/scope/OscilloScope';
import { ParamType } from '@/synth/types/SynthParam';
import Button from '@/components/Button.vue';
import ButtonSub from '@/components/ButtonSub.vue';
import BooleanSynthParam from '../components/BooleanSynthParam.vue';
import NumberArraySynthParam from '../components/NumberArraySynthParam.vue';
import NumberSynthParam from '../components/NumberSynthParam.vue';
import OptionSynthParam from '../components/OptionSynthParam.vue';

const props = defineProps<{
    audioModule: OscilloScope
}>();
const infoTextModal = inject<Ref<string>>('modalText');
const monoModeInteraction = useMonoModeInteraction();
const scope = ref(true);
const toggleScope = () => scope.value = !scope.value;
const showInfo = (info: string) => {
    if (!infoTextModal) throw new Error('infoTextModal not injected');
    infoTextModal.value = info;
    monoModeInteraction.activate("credits modal");
}

const moduleReady = ref(false);
props.audioModule.waitReady.then(() => moduleReady.value = true);
type microVec = [number, number];
const canvasSize: microVec = [300, 100];
const canvas = ref<HTMLCanvasElement | null>(null);
let context = computed(() => canvas.value?.getContext('2d'));
const width = canvasSize[0] + 'px';


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
let prevNeedleRadian = 0;

// const col1 = 'rgb(74, 19, 177)';
const col1 = '#FAD3FA'

const draw = (t: number) => {
    if (!context.value) return;
    const ctx = context.value;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ...canvasSize);


    if (scope.value) {
        const waveForm = props.audioModule.getWaveform();
        const waveLength = waveForm.length;
        ctx.beginPath();
        ctx.strokeStyle = col1;
        ctx.lineWidth = 1;
        const range = -1 / 255;
        const offsetY = canvasSize[1];
        if (waveLength < canvasSize[0]) {
            const scalex = canvasSize[0] / waveLength;
            for (let i = 0; i < waveLength; i++) {
                const x = i * scalex;
                const y = waveForm[i] * range * offsetY + offsetY;
                // const y = offsetY;
                ctx[i ? 'lineTo' : 'moveTo'](x, y);
            }
        } else {
            const scalei = waveLength / canvasSize[0];
            for (let i = 0; i < canvasSize[0]; i++) {
                const [min, max] = getWaveValueAt(i * scalei, (i + 1) * scalei, waveForm);
                // ctx[i ? 'lineTo' : 'moveTo'](i, min * range * offsetY + offsetY);
                ctx[i ? 'lineTo' : 'moveTo'](i, max * range * offsetY + offsetY);
            }
        }
        ctx.stroke();
    }
    requestAnimationFrame(draw);

}

onMounted(() => {
    requestAnimationFrame(draw);
});
</script>
<template>
    <div :style="{ width }" class="layout">
        <template v-if="moduleReady">
            <div :style="{ width }" class="scope-container">
                <canvas ref="canvas" :width="canvasSize[0]" :height="canvasSize[1]"
                    style="flex-grow: 0; flex-shrink: 0;"></canvas>
                <ButtonSub @click="toggleScope" class="scope-button" :class="{ on: scope }" tooltip="Toggle oscilloscope" />
            </div>

            <template v-for="param in audioModule.params">
                <NumberSynthParam v-if="param.type === ParamType.number" :param="param" />
                <BooleanSynthParam v-else-if="param.type === ParamType.boolean" :param="param" />
                <OptionSynthParam v-else-if="param.type === ParamType.option && param.options.length > 1" :param="param" />
                <NumberArraySynthParam v-else-if="param.type === ParamType.nArray" :param="param" />
            </template>
            <Button style="background-color: #ccc1;" v-if="audioModule.credits" @click="showInfo(audioModule.credits)"
                class="credits-button">Info</Button>
        </template>
        <template v-else>
            <div style="width: 100%; text-align: center;">Loading...</div>
        </template>
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

.scope-container {
    position: relative;
}

.scope-button.on {
    background-color: orange;
    mix-blend-mode: screen;
}

.scope-button {
    position: absolute;
    right: 7px;
    bottom: 7px;
    background-color: rgb(124, 113, 91);
    border: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    overflow: hidden;
    font-size: 0.5em;
    padding: 0;
    text-align: center;
    z-index: 1;
    cursor: pointer;
}

.scope-button:hover {
    box-shadow: 0px 0px 5px rgba(255, 193, 78, 0.479);
    background-color: orange;
    mix-blend-mode: screen;
}
</style>