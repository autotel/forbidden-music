<script setup lang="ts">
import { computed, watch } from 'vue';
import { useExclusiveContentsStore } from '../store/exclusiveContentsStore';
import { useMasterEffectsStore } from '../store/masterEffectsStore';
import { useSynthStore } from '../store/synthStore';
import ChannelSelector from './ChannelSelector.vue';
import AudioModuleContainer from './AudioModuleContainer.vue';
import ModuleContainer from './components/ModuleContainer.vue';
import AddSynth from './components/AddSynth.vue';
import TransparentContainer from './components/TransparentContainer.vue';
import { useBottomPaneStateStore } from '../store/bottomPaneStateStore';
import { PlaceholderSynth } from '../synth/PlaceholderSynth';
import { SynthChain } from '../dataStructures/SynthChain';
import ChainContainer from './ChainContainer.vue';
defineProps<{
    paneHeight: number
}>();

const synth = useSynthStore();
const effects = useMasterEffectsStore();
const exclusivesStore = useExclusiveContentsStore();
const bottomPaneState = useBottomPaneStateStore();
const synthChain = computed<SynthChain>(() => bottomPaneState.activeLayerChannel);
watch(()=>synth.channels, (newVal, oldVal) => {
    console.log('synth.channels changed', newVal, oldVal);
    bottomPaneState.activeLayerChannel = synth.channels[0];
});

watch (()=>bottomPaneState.activeLayerChannel.chain.length, (newVal, oldVal) => {
    console.log('bottomPaneState.activeLayerChannel.chain changed', newVal, oldVal);
});
</script>
<template>
    <div id="wrapper" v-if="paneHeight" class="bg-colored">
        <div id="hrow-items">
            <TransparentContainer>
                <ChannelSelector v-if="exclusivesStore.enabled" />
            </TransparentContainer>
            <ModuleContainer title="Notes" :rows="0">
            </ModuleContainer>
            <ChainContainer :synthChain="synthChain"/>
            <ModuleContainer title="Master" :rows="0">
                <template v-for="fx in effects.effectsChain">
                    <AudioModuleContainer :audioModule="fx" style="margin:-5px" undeletable/>
                </template>
            </ModuleContainer>
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