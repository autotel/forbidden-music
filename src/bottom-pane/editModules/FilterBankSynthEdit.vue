<script setup lang="ts">

import { computed, onBeforeUnmount, onMounted, onUnmounted, Ref, ref, watch } from 'vue';
import { KickSynth } from '@/synth/generators/KickSynth';
import { ParamType, SynthParam } from '@/synth/types/SynthParam';
import NumberSynthParam from '../components/NumberSynthParam.vue';
import BooleanSynthParam from '../components/BooleanSynthParam.vue';
import { useThrottleFn } from '@vueuse/core';
import { FilterBankSynth } from '@/synth/generators/FilterBankSynth';
import { S } from 'vitest/dist/reporters-5f784f42';

const props = defineProps<{
    audioModule: FilterBankSynth
}>();


type microVec = [number, number];

const canvasSize: microVec = [300, 100];
const canvas = ref<SVGAElement | null>(null);

const {
    filterOctaveMax,
    filterOctaveMin,
    Qmin,
    Qmax,
} = FilterBankSynth;

const octaveDisplayRange = filterOctaveMax - filterOctaveMin;
const qDisplayRange = Qmax - Qmin;

const octaveToX = (octave: number) => {
    return (octave - filterOctaveMin) / octaveDisplayRange * canvasSize[0];
}
const xToOctave = (x: number) => {
    return x / canvasSize[0] * octaveDisplayRange + filterOctaveMin;
}
const yToQ = (y: number) => {
    return Qmax - y / canvasSize[1] * qDisplayRange;
}
const qToY = (q: number) => {
    return (Qmax - q) / qDisplayRange * canvasSize[1];
}

const filterPoints = computed<microVec[]>(() => {
    return props.audioModule.filters.map(f => [octaveToX(f.octave), qToY(f.Q)]);
});

const dragStart = (e: MouseEvent, index: number) => {
    const target = e.target as SVGElement;
    // @ts-ignore
    e.target?.classList.add('dragged');
    const filter = props.audioModule.filters[index];
    const onlyVertical = index === 0;
    const drag = (e: MouseEvent) => {
        const rect = canvas.value!.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        filter.Q = yToQ(y);
        if (filter.Q < Qmin) filter.Q = Qmin;
        if (filter.Q > Qmax) filter.Q = Qmax;

        if(onlyVertical) return;
        filter.octave = xToOctave(x);
        if (filter.octave < filterOctaveMin) filter.octave = filterOctaveMin;
        if (filter.octave > filterOctaveMax) filter.octave = filterOctaveMax;
    }
    const dragEnd = () => {
        window.removeEventListener('mousemove', drag);
        window.removeEventListener('mouseup', dragEnd);
        // @ts-ignore
        e.target?.classList.remove('dragged');
    }
    window.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', dragEnd);
}


const PI2 = Math.PI * 2;
const zeroXPos = octaveToX(0);
// onBeforeUnmount(() => {
//     removeNewWaveListeners(props.audioModule);
// });


type ParamGroupTitleTuple = [SynthParam[], string];

const paramsGroups = computed<ParamGroupTitleTuple[]>(() => {
    return [
        [props.audioModule.params.slice(0, 5), "VCA Env"],
        [props.audioModule.params.slice(15), "fb Dist"],
        [props.audioModule.params.slice(5, 10), "Gn.Env"],
        [props.audioModule.params.slice(10, 15), "Routing"],
    ];
});

</script>
<template>
    <div style="text-align: center;  ">
        <svg ref="canvas" :width="canvasSize[0]" :height="canvasSize[1]" style="flex-grow: 0; flex-shrink: 0;">
            <line :x1="zeroXPos" y1="0" :x2="zeroXPos" :y2="canvasSize[1]" />
            <circle v-for="(point, index) in filterPoints" :cx="point[0]" :cy="point[1]" r="5" class="filterEllipse"
                @mousedown="(e) => dragStart(e, index)" />
        </svg>
        <div class="layout">
            <div v-for="([paramGroup, title]) in paramsGroups" class="group">
                <div class="title">
                    <p>{{ title }}</p>
                </div>
                <template v-for="param in paramGroup">
                    <NumberSynthParam v-if="param.type === ParamType.number" :param="param" />
                    <BooleanSynthParam v-else-if="param.type === ParamType.boolean" :param="param" />
                </template>
            </div>
        </div>
    </div>
</template>
<style scoped>
.filterEllipse {
    fill: transparent;
    cursor: grab;
}

.filterEllipse:hover {
    fill: rgba(143, 143, 143, 0.548);
}

.filterEllipse.dragged {
    cursor: grabbing;
}


.group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: rgba(177, 176, 176, 0.1);
    /* border:solid 1px; */
    border-radius: 0.7em;
    margin: 0 0.5em;
    height: 5em;
    overflow: hidden;
}

.group .title {
    position: relative;
    display: block;
    height: 100%;
    width: 1.6em;
    left: 0;
    /* mix-blend-mode: difference; */
}

.group .title p {
    position: absolute;
    text-align: center;
    width: 5em;
    white-space: nowrap;
    bottom: 0;
    left: 0;
    transform: translate(1.5em, 0) rotate(-90deg);
    transform-origin: bottom left;
    background-color: rgba(153, 153, 153, 0.938);
    color: rgba(255, 255, 255, 0.603);
    padding: 0 0.5em;
}

.layout {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5em;
    height: 100%;
    width: 50em;
    
}
svg {
    
    border:solid 1px #00000041;

}
</style>