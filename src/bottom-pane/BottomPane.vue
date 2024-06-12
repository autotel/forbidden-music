<script setup lang="ts">
import { computed, ref } from 'vue';
import { useExclusiveContentsStore } from '../store/exclusiveContentsStore';
import { useMasterEffectsStore } from '../store/masterEffectsStore';
import { SynthChannel, useSynthStore } from '../store/synthStore';
import ChannelSelector from './ChannelSelector.vue';
import SynthEditSelector from './SynthEditSelector.vue';
import ModuleContainer from './components/ModuleContainer.vue';

defineProps<{
    paneHeight: number
}>();


const synth = useSynthStore();
const effects = useMasterEffectsStore();
const exclusivesStore = useExclusiveContentsStore();
const synthChain = computed(() => [
    ...activeLayerChan.value.chain,
    ...effects.effectsChain,
]);

const activeLayerChan = ref<SynthChannel>(synth.channels[0]);

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