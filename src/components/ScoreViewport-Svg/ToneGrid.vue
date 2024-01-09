<script setup lang="ts">
import { Ref, onMounted, ref, watch } from 'vue';
import { useSnapStore } from '../../store/snapStore';
import { useViewStore } from '../../store/viewStore';
import { useToolStore } from '../../store/toolStore';
import { Tool } from '../../dataTypes/Tool';
import { paramRangeToAutomationRange } from '../../dataTypes/AutomationPoint';
const view = useViewStore();
const linePositionsPx = ref([]) as Ref<number[]>;
const snap = useSnapStore();
const tool = useToolStore();
watch([view, snap.values], () => {
    linePositionsPx.value = [];
    switch (tool.current) {
        case Tool.Automation:{
            const currentParameter = tool.laneBeingEdited?.targetParameter
            if(currentParameter && 'max' in currentParameter && 'min' in currentParameter) {
                const mmx = {
                    max:currentParameter.max,
                    min:currentParameter.min,
                };
                const vs = [
                    paramRangeToAutomationRange(0,mmx),
                    paramRangeToAutomationRange(1,mmx),
                    paramRangeToAutomationRange(-1,mmx),
                    paramRangeToAutomationRange(10,mmx),
                    paramRangeToAutomationRange(-10,mmx),
                ];
                linePositionsPx.value.push(
                    ...vs.map(view.valueToPxWithOffset)
                )
            }
            break;
       } 
       default:
            if (snap.values['customFrequencyTable']?.active) {
                // display one line per frequency in the tableä
                const octaves = snap.customOctavesTable;
                for (let i = 0; i < octaves.length; i++) {
                    const octave = octaves[i];
                    if (!view.isOctaveInView(octave)) continue;
                    linePositionsPx.value.push(
                        view.octaveToPxWithOffset(octave)
                    );
                }
            } else {
                for (let i = 1; i < 14; i++) {
                    if (!view.isOctaveInView(i)) continue;
                    linePositionsPx.value.push(
                        view.octaveToPxWithOffset(i)
                    );
                }
            }
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
    <text x="0" :y="view.octaveToPxWithOffset(4)">4</text>
    <text x="0" :y="view.octaveToPxWithOffset(8)">8</text>
    <text x="0" :y="view.octaveToPxWithOffset(12)">12</text>
    <text x="0" :y="view.octaveToPxWithOffset(16)">16</text>
</template>
<style scoped>
.grid-line {
    stroke: #e0e0e0;
    /* stroke: #250909; */
    stroke-width: 1px;
    /* stroke-dasharray: 3px */
}
</style>