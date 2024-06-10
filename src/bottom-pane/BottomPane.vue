<script setup lang="ts">
import ModuleContainer from './components/ModuleContainer.vue';
import Knob from './components/Knob.vue';
import { usePlaybackStore } from '../store/playbackStore';
import { useSynthStore } from '../store/synthStore';
import { KickSynth } from '../synth/KickSynth';
import { onBeforeMount, ref } from 'vue';
import { ParamType } from '../synth/interfaces/SynthParam';
defineProps<{
    paneHeight: number
}>();
const synthStore = useSynthStore();

const kick = ref<KickSynth | undefined>();


onBeforeMount(() => {
    kick.value = synthStore.availableSynths.find(s => {
        return s.name === 'KickSynth'
    }) as KickSynth
});

</script>
<template>
    <div id="modules-container" v-if="paneHeight">
        <ModuleContainer v-if="kick" :title="kick?.name">
            <div style="display: flex;flex-direction: column; align-items: center;">
            <template v-for="param in kick?.params">
                <Knob v-if="param.type === ParamType.number" :param="param" />
            </template>
            </div>
        </ModuleContainer>
    </div>

</template>
<style scoped>
#modules-container {
    box-sizing: border-box;
    height: calc(100% - 0.5em);
    display: flex;
    flex-wrap: wrap;
}
</style>