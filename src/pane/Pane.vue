<script setup lang="ts">

import FileManager from './FileManager.vue';
import WorkingMemory from './WorkingMemory.vue';
import MidiInputConfig from './MidiInputConfig.vue';
import SnapSelector from './SnapSelector.vue';
import SynthEdit from './SynthEdit.vue';
import PerformanceSettings from './PerformanceSettings.vue';

const props = defineProps<{
    paneWidth: number
}>()

</script>
<template>
    <div class="drawers-container" :style="{ width: paneWidth + 'px' }">
        <WorkingMemory startExpanded/>
        <FileManager/>
        <SynthEdit />
        <SnapSelector startExpanded/>
        <PerformanceSettings />
        <!-- <MidiInputConfig v-if="playback.midiInputs.length" /> -->
    </div>
</template>

<style scoped>
.drawers-container {
    position: absolute;
    top: 0;
    right: 0;
    display: inline-block;
    height: calc(100vh - 90px);
    transition: width 0.2s;
    overflow-y: auto;
    overflow-x: hidden;
}
</style>
