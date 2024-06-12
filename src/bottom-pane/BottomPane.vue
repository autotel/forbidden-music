<script setup lang="ts">
import ModuleContainer from './components/ModuleContainer.vue';
import Knob from './components/Knob.vue';
import { usePlaybackStore } from '../store/playbackStore';
import { SynthChannel, useSynthStore } from '../store/synthStore';
import { KickSynth } from '../synth/KickSynth';
import SynthEditSelector from './SynthEditSelector.vue';
import { computed, onBeforeMount, ref } from 'vue';
import { ParamType } from '../synth/interfaces/SynthParam';
import KickSynthEdit from './editModules/KickSynthEdit.vue';
import ChannelSelector from './ChannelSelector.vue';
import { useExclusiveContentsStore } from '../store/exclusiveContentsStore';
import OtherSynths from './editModules/OtherSynths.vue';
import { useMasterEffectsStore } from '../store/masterEffectsStore';
defineProps<{
    paneHeight: number
}>();


const synth = useSynthStore();
const effects = useMasterEffectsStore();
const exclusivesStore = useExclusiveContentsStore();
const synthChain = computed(() => [
    currentSynth.value,
    ...effects.effectsChain,

]);

const activeLayerChan = ref<SynthChannel>(synth.getOrCreateChannel(0));
const currentSynth = computed(() => activeLayerChan.value.synth);

</script>
<template>
    <div id="wrapper" v-if="paneHeight">
        <div id="hrow-items">
            <ChannelSelector v-if="exclusivesStore.enabled" :active-layer-chan="activeLayerChan"
                @change:activeLayerChan="activeLayerChan = $event" />
            <ModuleContainer title="Notes" :rows="0">
            </ModuleContainer>
            <SynthEditSelector v-for="synth in synthChain" :audioModule="synth" />
        </div>
    </div>

</template>
<style scoped>
#hrow-items {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-content: flex-start;

}

#hrow-items>* {
    display: inline-block;
    margin: 0.5em;
    vertical-align: top;
    flex-shrink: 0;
    flex-grow: 0;
    text-wrap: none;
}

#wrapper {
    box-sizing: border-box;
    display: block;
    width: 100vw;
    overflow: auto;
}
</style>