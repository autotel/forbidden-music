<script setup lang="ts">
import { computed } from 'vue';
import { KickSynth } from '../synth/KickSynth';
import { SynthPlaceholder } from '../synth/PlaceholderSynth';
import { AudioModule } from '../synth/interfaces/AudioModule';
import SynthReplace from './editModules/SynthReplace.vue';
import KickSynthEdit from './editModules/KickSynthEdit.vue';
import OtherAudioModules from './editModules/OtherAudioModules.vue';
import ModuleContainer from './components/ModuleContainer.vue';
import Button from '../components/Button.vue';
import { useBottomPaneStateStore } from '../store/bottomPaneStateStore';
import { useSynthStore } from '../store/synthStore';

const props = defineProps<{
    audioModule: AudioModule
}>();
const bottomPaneState = useBottomPaneStateStore();
const synth = useSynthStore();
const getComponentFor = (audioModule: AudioModule) => {
    if (audioModule instanceof SynthPlaceholder) {
        return SynthReplace;
    } else if (audioModule instanceof KickSynth) {
        return KickSynthEdit;
    } else {
        return OtherAudioModules;
    }
}

const remove = () => {
    console.log('removing', props.audioModule);
    const {activeLayerChannel} = bottomPaneState;
    synth.removeAudioModule(activeLayerChannel, props.audioModule);
}

</script>
<template>
    <ModuleContainer v-if="audioModule" :title="audioModule.name">
        <template #icons>
            <Button danger :onClick="remove" tooltip="delete" style="background-color:transparent">×</Button>
        </template>
        <template #default>
        <component :is="getComponentFor(audioModule)" :audioModule="audioModule" />
        </template>
    </ModuleContainer>
</template>