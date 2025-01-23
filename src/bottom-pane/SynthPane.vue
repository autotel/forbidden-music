<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { SynthChain } from '@/dataStructures/SynthChain';
import { useAudioContextStore } from '@/store/audioContextStore';
import { useBottomPaneStateStore } from '@/store/bottomPaneStateStore';
import { useSynthStore } from '@/store/synthStore';
import ChainContainer from './ChainContainer.vue';
import ChannelSelector from './ChannelSelector.vue';
import ModuleContainer from './components/ModuleContainer.vue';
import TransparentContainer from './components/TransparentContainer.vue';
import NotesContainer from './editModules/NotesContainer.vue';
import { useMasterEffectsStore } from '@/store/masterEffectsStore';
defineProps<{
    paneHeight: number
}>();

const synth = useSynthStore();
const bottomPaneState = useBottomPaneStateStore();
const audioContextStore = useAudioContextStore();
const masterEffects = useMasterEffectsStore();
const synthChain = computed<SynthChain | null>(() => bottomPaneState.activeLayerChannel);
const thereIsAudio = ref(false);

watch(() => synth.channels.children, (newVal, oldVal) => {
    hardForcePaneRefresh();
});

const selectedChannelSlotNumber = computed(() => {
    if (!bottomPaneState.activeLayerChannel) return -1;
    const index = synth.channels.children.indexOf(bottomPaneState.activeLayerChannel);
    return index;
});

const hardForcePaneRefresh = () => {
    bottomPaneState.activeLayerChannel = null;
    setTimeout(() => {
        bottomPaneState.activeLayerChannel = synth.channels.children[0] ?? null;
    }, 10);
};

onMounted(async () => {
    await audioContextStore.audioContextPromise;
    setTimeout(() => {
        bottomPaneState.activeLayerChannel = synth.channels.children[0] ?? null;
    }, 0);
    thereIsAudio.value = true;
});
</script>
<template>
    <div id="wrapper" class="bg-colored">
        <div id="hrow-items">
            <template v-if="thereIsAudio">
                <TransparentContainer>
                    <ChannelSelector />
                </TransparentContainer>
                <NotesContainer :channelSlotNo="selectedChannelSlotNumber" />
                <ChainContainer v-if="synthChain" :synthChain="synthChain" />
                <ModuleContainer title="Master" >
                    <ChainContainer :synthChain="masterEffects.effectsChain" />
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
    overflow: hidden;
    overflow-x: auto;
}

#hrow-items>* {
    display: inline-block;
    margin: 0.25em;
    margin-bottom: 0;
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