<script setup lang="ts">

import ExtraContentSources from './ExtraContentSources.vue';
import FileManager from './FileManager.vue';
import FtCaptureManager from './FtCaptureManager.vue';
import LayersManager from './LayersManager.vue';
import MidiInputConfig from './MidiInputConfig.vue';
import PerformanceSettings from './PerformanceSettings.vue';
import Physical from './Physical.vue';
import SnapSelector from './SnapSelector.vue';
import WorkingMemory from './WorkingMemory.vue';
defineProps<{
    paneWidth: number
    paneHeight: number
}>()

</script>
<template>
    <div class="right-pane"
        :style="{ width: paneWidth + 'px', height: paneHeight + 'px', display: paneWidth ? 'unset' : 'none' }">
        <FileManager startExpanded/>
        <WorkingMemory startExpanded />
        <ExtraContentSources/>
        <LayersManager />
        <SnapSelector startExpanded />
        <FtCaptureManager />
        <MidiInputConfig />
        <Physical />
        <PerformanceSettings />
        <div class="about padded" style="text-align:right">
            <a href="https://autotel.co?goto=piano+roll" target="_blank">about</a>&nbsp;
            <a href="https://github.com/autotel/forbidden-music" target="_blank">code</a>&nbsp;
            <a href="docs/" target="_blank">manual</a>
        </div>
    </div>
</template>

<style scoped>
.right-pane {
    position: absolute;
    top: 0;
    right: 0;
    display: inline;
    flex-direction: column;
    height: calc(100vh - 90px);
    transition: width 0.2s;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.3em;
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
