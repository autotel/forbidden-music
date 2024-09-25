<script setup lang="ts">

import Button from '@/components/Button.vue';
import { frequencyToOctave } from '@/functions/toneConverters';
import { SampleFileDefinition, SampleKitUser, SampleSource } from '@/synth/features/chromaticSampleKitUser';
import { Synth } from '@/synth/types/Synth';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import isDev from '@/functions/isDev';

const showDetails = isDev();
const props = defineProps<{
    audioModule: Synth & SampleKitUser
}>();
const expanded = ref(true);

await props.audioModule.waitReady;


const currentData = ref<SampleSource[]>(props.audioModule.sampleKitManager.sampleSources);

const currentlyHoveredSample = ref<SampleSource | null>(null); 
const lastTriggeredSampleIndexes = ref<number[]>([]);
const lastTriggeredSample = ref<SampleSource | null>(null);

const sampleChangedListener = () => {
    currentData.value = props.audioModule.sampleKitManager.sampleSources;
}

const sampleWasChosenListener = (sample: SampleSource, index: number) => {
    lastTriggeredSampleIndexes.value.push(index);
    lastTriggeredSample.value = sample;
    setTimeout(() => {
        lastTriggeredSampleIndexes.value = lastTriggeredSampleIndexes.value.filter(i => i !== index);
    }, 500);
}

const sampleLoadedListener = (_sample: SampleSource, index:number) => {
    // just to trigger a redraw
    currentData.value = [...currentData.value];
}

onMounted(() => {
    props.audioModule.sampleKitManager.addSampleKitChangedListener(sampleChangedListener);
    props.audioModule.sampleKitManager.addSampleItemChosenListener(sampleWasChosenListener);
    props.audioModule.sampleKitManager.addSampleItemLoadedListener(sampleLoadedListener);
});

onBeforeUnmount(() => {
    props.audioModule.sampleKitManager.removeSampleKitChangedListener(sampleChangedListener);
    props.audioModule.sampleKitManager.removeSampleItemChosenListener(sampleWasChosenListener);
    props.audioModule.sampleKitManager.removeSampleItemLoadedListener(sampleLoadedListener);
})

const fToY = (freq: number) => {
    if (freq === Infinity) return 1000;
    const octave = frequencyToOctave(freq);
    return 50 * octave
}

const velToX = (vel: number) => {
    if (vel === Infinity) return 100;
    return vel * 100 / 127;
}

const sampleDivStyle = (sample: SampleFileDefinition) => {

    const ret: { [key: string]: string } = {
        left: velToX(sample.velocityStart) + '%',
        top: fToY(sample.frequencyStart) - 40 + 'px',
        width: velToX(sample.velocityEnd - sample.velocityStart) + '%',
        height: fToY(sample.frequencyEnd) - fToY(sample.frequencyStart) + 'px',
    }
    if (sample.frequencyStart === 0) {
        ret.borderTop = 'transparent';
    }
    if (sample.frequencyEnd === Infinity) {
        ret.borderBottom = 'transparent';
        ret.height = '15px';
    }
    return ret;
}

</script>
<template>
    <div class="sample-map-display">
        <template v-if="expanded">
            <div class="map">
                <div class="scaler">
                    <template v-for="(sample, index) in currentData" :key="sample.path">
                        <div class="sample-rect" :style="sampleDivStyle(sample)"
                            :class="{ 
                                triggered: lastTriggeredSampleIndexes.includes(index),
                                loading: sample.isLoading,
                            }"
                            @mouseenter="() => currentlyHoveredSample = sample"
                            @mouseleave="() => currentlyHoveredSample = null">
                        </div>

                    </template>
                </div>
            </div>
        </template>

        <template v-else>
            <Button :onClick="() => expanded = true">{{ audioModule.sampleKitParam.value.name }}</Button>
        </template>
        <!-- <ul class="data padded" v-if="showDetails">
            <li>{{ lastTriggeredSample ? lastTriggeredSample.name : '' }}</li>
            <li>{{ currentData.length }}</li>
            <li><ul v-if="currentlyHoveredSample" class="hovered-item-data">
                <li>{{ currentlyHoveredSample.name }}</li>
                <li>Vel: {{ currentlyHoveredSample.velocityStart }}-{{ currentlyHoveredSample.velocityEnd }}</li>
                <li>Fq: {{ currentlyHoveredSample.frequencyStart }}-{{ currentlyHoveredSample.frequencyEnd }}</li>
            </ul></li>
        </ul> -->
    </div>

</template>
<style scoped>
.sample-map-display {
    height: 100%;
    width: auto;
    display: flex;
}

.map .sample-rect {
    display: block;
    position: absolute;
    /* background-color: white; */
    opacity: 0.5;
    border: solid 1px #374559;
    background-color: white;
    transition: all 0.8s;
}
.map .sample-rect.triggered {
    box-shadow: 0 0 10px rgba(224, 255, 46, 0.815);;
    opacity: 1;
    z-index: 1;
    background-color: rgb(242, 255, 167);
    border: none;
}

.map .sample-rect:hover {
    opacity: 1;
    z-index: 1;
    box-shadow: 0 0 10px white;
    border: none;
}

.map .sample-rect.loading {
    opacity: 0.1;
}

.map .scaler {
    position: relative;
    width: 157px;
    /* transform: scale(1.5); */
}

.sample-map-display ul.data {
    width: 200px;
    display: inline-block;
    height: 100%;
    list-style-type: none;
    padding: 0;
}
.sample-map-display .data li {
    word-break: break-all;
}
.sample-map-display .map {
    display: inline-block;
    overflow: auto;
    height: 100%;
    width: 170px;
    color: rgba(255, 255, 255, 0.452);
    background-color: #374559;
}
</style>