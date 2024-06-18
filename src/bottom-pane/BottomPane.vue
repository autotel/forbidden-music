<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { SynthChain } from '../dataStructures/SynthChain';
import { useAudioContextStore } from '../store/audioContextStore';
import { useBottomPaneStateStore } from '../store/bottomPaneStateStore';
import { useExclusiveContentsStore } from '../store/exclusiveContentsStore';
import { useMasterEffectsStore } from '../store/masterEffectsStore';
import { useSynthStore } from '../store/synthStore';
import AudioModuleContainer from './editModules/AudioModuleContainer.vue';
import ChainContainer from './ChainContainer.vue';
import ChannelSelector from './ChannelSelector.vue';
import ModuleContainer from './components/ModuleContainer.vue';
import TransparentContainer from './components/TransparentContainer.vue';
defineProps<{
    paneHeight: number
}>();

const synth = useSynthStore();
const effects = useMasterEffectsStore();
const exclusivesStore = useExclusiveContentsStore();
const bottomPaneState = useBottomPaneStateStore();
const audioContextStore = useAudioContextStore();
const synthChain = computed<SynthChain | null>(() => bottomPaneState.activeLayerChannel);
const thereIsAudio = ref(false);
watch(()=>synth.channels, (newVal, oldVal) => {
    console.log('synth.channels changed', newVal, oldVal);
    bottomPaneState.activeLayerChannel = synth.channels.chains[0] ?? null;
});

watch (()=>bottomPaneState.activeLayerChannel?.chain.length, (newVal, oldVal) => {
    console.log('bottomPaneState.activeLayerChannel.chain changed', newVal, oldVal);
});

onMounted(async() => {
    await audioContextStore.audioContextPromise;
    setTimeout(() => {
        bottomPaneState.activeLayerChannel = synth.channels.chains[0] ?? null;
    }, 0);
    thereIsAudio.value = true;
});
</script>
<template>
    <div id="wrapper" v-if="paneHeight" class="bg-colored">
        <div id="hrow-items">
            <template v-if="thereIsAudio">
                <TransparentContainer>
                    <ChannelSelector v-if="exclusivesStore.enabled" />
                </TransparentContainer>
                <ModuleContainer title="Notes" :rows="0">
                </ModuleContainer>
                <ChainContainer v-if="synthChain" :synthChain="synthChain"/>
                <ModuleContainer title="Master" :rows="0">
                    <template v-for="fx in effects.effectsChain">
                        <AudioModuleContainer :audioModule="fx" style="margin:-5px" undeletable/>
                    </template>
                </ModuleContainer>
            </template>
            <template v-else>
                <div class="padded">
                    <h3>Waiting for audio permission</h3>
                    <p>Interact with the page to provide</p>
                </div>
            </template>
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