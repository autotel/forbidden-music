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


const currentData = ref<SampleSource[]>(props.audioModule.sampleKitManager.sampleSources);

const currentlyHoveredSample = ref<SampleSource | null>(null);
const lastTriggeredSample = ref<[SampleSource, number] | null>(null);

const sampleChangedListener = () => {
    currentData.value = props.audioModule.sampleKitManager.sampleSources;
}

const sampleWasChosenListener = (sample: SampleSource, index: number) => {
    console.log("ch", index, sample);
    lastTriggeredSample.value = [sample, index];
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
                            :class="{ triggered: lastTriggeredSample && lastTriggeredSample[1] === index }"
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
        <div>
            {{ lastTriggeredSample ? lastTriggeredSample[1] : '' }}
            <p v-if="currentlyHoveredSample" class="hovered-item-data">
                {{ currentlyHoveredSample.name }}<br>
                Vel: {{ currentlyHoveredSample.velocityStart }}-{{ currentlyHoveredSample.velocityEnd }}<br>
                Fq: {{ currentlyHoveredSample.frequencyStart }}-{{ currentlyHoveredSample.frequencyEnd }}<br>
            </p>
        </div>
    </div>

</template>
<style scoped>
.sample-map-display {
    height: 100%;
    width: 400px;
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


.map {
    overflow: auto;
    height: 100%;
    width: 200px;
    color: rgba(255, 255, 255, 0.452);
    background-color: #374559;
}

.map .scaler {
    position: relative;
    width: 157px;
    /* transform: scale(1.5); */
}

.hovered-item-data {
    width: 200px;
}
</style>