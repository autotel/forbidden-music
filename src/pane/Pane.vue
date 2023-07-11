<script setup lang="ts">

import LibraryManager from './LibraryManager.vue';
import MidiInputConfig from './MidiInputConfig.vue';
import SnapSelector from './SnapSelector.vue';
import SynthEdit from './SynthEdit.vue';

const props = defineProps<{
    paneWidth: number
}>()

</script>
<template>
    <div class="drawers-container" :style="{ width: paneWidth + 'px' }">
        <LibraryManager />
        <SynthEdit />
        <SnapSelector />
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
