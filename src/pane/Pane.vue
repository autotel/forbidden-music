<script setup lang="ts">

import FileManager from './FileManager.vue';
import WorkingMemory from './WorkingMemory.vue';
import MidiInputConfig from './MidiInputConfig.vue';
import SnapSelector from './SnapSelector.vue';
import SynthEdit from './SynthEdit.vue';
import PerformanceSettings from './PerformanceSettings.vue';
import { usePlaybackStore } from '../store/playbackStore';
import LayersManager from './LayersManager.vue';

const playback = usePlaybackStore();
const props = defineProps<{
    paneWidth: number
}>()

</script>
<template>
    <div class="drawers-container" :style="{ width: paneWidth + 'px' }">
        <WorkingMemory startExpanded/>
        <FileManager/>
        <SynthEdit />
        <LayersManager />
        <SnapSelector startExpanded/>
        <PerformanceSettings />
        <MidiInputConfig/>
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
