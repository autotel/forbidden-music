<script setup lang="ts">

import Button from '@/components/Button.vue';
import { frequencyToOctave } from '@/functions/toneConverters';
import externalSampleLibrariesStore, { SampleKitDefinition } from '@/store/externalSampleLibrariesStore';
import { SampleFileDefinition, SampleKitUser, SampleSource } from '@/synth/features/chromaticSampleKitUser';
import { Synth } from '@/synth/types/Synth';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{
    audioModule: Synth & SampleKitUser
}>();
const expanded = ref(true);

await props.audioModule.waitReady;


const currentData = ref<SampleKitDefinition>(props.audioModule.sampleKitManager.lastSampleDefinition);

const currentlyHoveredSample = ref<SampleFileDefinition | null>(null);
const lastTriggeredSample = ref<string | null>(null);

const sampleChangedListener = () => {
    currentData.value = props.audioModule.sampleKitManager.lastSampleDefinition;
}

const sampleWasChosenListener = (sample:SampleSource, index:number) => {
    console.log("ch");
    lastTriggeredSample.value = sample.sampleIdentifier;
}
onMounted(() => {
    props.audioModule.sampleKitManager.addSampleKitChangedListener(sampleChangedListener);
    props.audioModule.sampleKitManager.addSampleItemChosenListener(sampleWasChosenListener);
});

onBeforeUnmount(() => {
    props.audioModule.sampleKitManager.removeSampleKitChangedListener(sampleChangedListener);
    props.audioModule.sampleKitManager.removeSampleItemChosenListener(sampleWasChosenListener);
})

const fToY = (freq: number) => {
    if(freq === Infinity) return 1000;
    const octave = frequencyToOctave(freq);
    return 100 * octave
}

const velToX = (vel: number) => {
    if (vel === Infinity) return 100;
    return vel / 127 * 100;
}

const sampleDivStyle = (sample: SampleFileDefinition) => {
    
    const ret: {[key:string]:string} = {
        left: velToX(sample.velocityStart) + '%',
        top: fToY(sample.frequencyStart) + 'px',
        width: velToX(sample.velocityEnd - sample.velocityStart)+ '%',
        height: fToY(sample.frequencyEnd) - fToY(sample.frequencyStart) + 'px',
    }
    if(sample.frequencyStart === 0) {
        ret.borderTop = 'transparent';
    }
    if(sample.frequencyEnd === Infinity) {
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
                    <template v-for="sample in currentData.samples" :key="sample.path">
                        <div class="sample-rect" :style="sampleDivStyle(sample)"
                            @mouseenter="() => currentlyHoveredSample = sample"
                            @mouseleave="() => currentlyHoveredSample = null" >
                            <p v-if="lastTriggeredSample && lastTriggeredSample === sample.path" style="color: red;">*</p>
                        </div>

                    </template>
                </div>
            </div>
        </template>

        <template v-else>
            <Button :onClick="() => expanded = true">{{ audioModule.sampleKitParam.value.name }}</Button>
        </template>

        <p v-if="currentlyHoveredSample" class="hovered-item-data">
            {{lastTriggeredSample}}
            {{ currentlyHoveredSample.name }}<br>
            Vel: {{ currentlyHoveredSample.velocityStart }}-{{ currentlyHoveredSample.velocityEnd }}<br>
            Fq: {{ currentlyHoveredSample.frequencyStart }}-{{ currentlyHoveredSample.frequencyEnd }}<br>
        </p>
    </div>

</template>
<style scoped>
.sample-map-display {
    height: 100%;
    width: 400px;
    display:flex;
}

.map .sample-rect {
    display: block;
    position: absolute;
    /* background-color: white; */
    opacity: 0.5;
    border: solid 1px #374559;
    background-color: white;
}

.map .sample-rect:hover {
    position: absolute;
    opacity: 1;
    z-index: 1;
    box-shadow: 0 0 10px white;
    border: none;
}


.map {
    overflow: auto;
    height: 100%;
    width: 200px;
    color:rgba(255, 255, 255, 0.452);
    background-color: #374559;
}

.map .scaler {
    position: relative;
    width: 157px;
    transform: scale(1.5);
}

.hovered-item-data {
    width: 200px;
}
</style>