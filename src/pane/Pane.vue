<script setup lang="ts">

import FileManager from './FileManager.vue';
import WorkingMemory from './WorkingMemory.vue';
import MidiInputConfig from './MidiInputConfig.vue';
import SnapSelector from './SnapSelector.vue';
import SynthEdit from './SynthEdit.vue';
import PerformanceSettings from './PerformanceSettings.vue';
import { usePlaybackStore } from '../store/playbackStore';
import LayersManager from './LayersManager.vue';
import Physical from './Physical.vue';
import { useExclusiveContentsStore } from '../store/exclusiveContentsStore';
const playback = usePlaybackStore();
const props = defineProps<{
    paneWidth: number
}>()
const exclusives = useExclusiveContentsStore();
</script>
<template>
    <div class="drawers-container" :style="{ width: paneWidth + 'px' }">
        <WorkingMemory startExpanded />
        <FileManager />
        <LayersManager v-if="exclusives.enabled" />
        <SynthEdit />
        <SnapSelector startExpanded />
        <MidiInputConfig />
        <Physical />
        <PerformanceSettings />
        <div class="about padded" style="text-align:right">
            <a href="https://autotel.co?goto=piano+roll" target="_blank">about</a>&nbsp;
            <a href="https://github.com/autotel/forbidden-music" target="_blank">code</a>
        </div>
    </div>
</template>

<style scoped>
.drawers-container {
    position: absolute;
    top: 0;
    right: 0;
    display: inline;
    flex-direction: column;
    height: calc(100vh - 90px);
    transition: width 0.2s;
    overflow-y: auto;
    overflow-x: hidden;
}
</style>
<style>
.icon svg {
    font-size: 30px;
}

.icon {
    font-size: 20px;
}


</style>
