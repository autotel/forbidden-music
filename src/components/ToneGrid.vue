<script setup lang="ts">
import { useViewStore } from '../store/viewStore';
import { onMounted, Ref, ref, watch, watchEffect, computed } from 'vue';
import { usePlaybackStore } from '../store/playbackStore';
import { useSnapStore } from '../store/snapStore';

const view = useViewStore();
const linePositionsPx = ref([]) as Ref<number[]>;
const lineValues = ref([]) as Ref<number[]>;
const snap = useSnapStore();

watch([view,snap.values],() => {
    linePositionsPx.value = [];
    lineValues.value = [];
    if (snap.values['customFrequencyTable']?.active) {
        // display one line per frequency in the tableä
        const frequencies = snap.customFrequenciesTable;
        for (let i = 0; i < frequencies.length; i++) {
            if(!view.isOctaveInView(i)) continue;
            linePositionsPx.value.push(
                view.frequencyToPxWithOffset(frequencies[i])
            );
            lineValues.value.push(frequencies[i]);
        }
    } else {
        let cc= 0 
        for (let i = 0; i < 32; i++) {
            if(!view.isOctaveInView(i)) continue;
            linePositionsPx.value.push(
                view.octaveToPxWithOffset(i)
            );
            cc++;
        }
        console.log(cc)

    }
});
onMounted(() => {


});

</script>
<template>
    <!-- draw a line for each one unit of time -->
    <template v-for="(linePositionPx, i) in linePositionsPx">
        <line class="grid-line" x1="0" :x2="view.viewWidthPx" :y1="linePositionPx" :y2="linePositionPx" />
        <!-- <text x="0" :y="linePositionPx" :dy="i == 0 ? '1em' : '0.3em'"
            :text-anchor="i == 0 ? 'end' : 'start'">{{ lineValues[i] }}</text> -->

    </template>
    <text x="0" :y="view.octaveToPxWithOffset(0)">0</text>
    <text x="0" :y="view.octaveToPxWithOffset(2)">2</text>
    <text x="0" :y="view.octaveToPxWithOffset(4)">4</text>
    <text x="0" :y="view.octaveToPxWithOffset(8)">8</text>
    <text x="0" :y="view.octaveToPxWithOffset(16)">16</text>
</template>
<style>
.grid-line {
    stroke: #e0e0e0;
    /* stroke: #250909; */
    stroke-width: 1px;
    stroke-dasharray: 3px
}
</style>