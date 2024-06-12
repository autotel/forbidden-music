<script setup lang="ts">

import { useBottomPaneStateStore } from '../../store/bottomPaneStateStore';
import { SynthConstructorWrapper, useSynthStore } from '../../store/synthStore';
import { Synth } from '../../synth/super/Synth';
import SynthSelector from '../SynthSelector.vue';
const props = defineProps<{
    audioModule: Synth
}>();
const synthStore = useSynthStore();

const bottomPaneState = useBottomPaneStateStore();
const replaceSynth = (synth: SynthConstructorWrapper) => {
    console.log('replacing synth', synth);
    synthStore.replaceAudioModule(
        bottomPaneState.activeLayerChannel,
        props.audioModule,
        synth
    );
}
</script>
<template>
    <div style="height:100%; overflow-y: auto; width: 12em;">
        <SynthSelector @select="replaceSynth" />
    </div>
</template>