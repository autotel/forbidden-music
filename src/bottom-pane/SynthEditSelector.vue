<script setup lang="ts">
import ModuleContainer from './components/ModuleContainer.vue';
import Knob from './components/Knob.vue';
import { usePlaybackStore } from '../store/playbackStore';
import { SynthChannel, useSynthStore } from '../store/synthStore';
import { KickSynth } from '../synth/KickSynth';
import { computed, onBeforeMount, ref } from 'vue';
import { ParamType } from '../synth/interfaces/SynthParam';
import { AudioModule } from '../synth/interfaces/AudioModule';
import KickSynthEdit from './editModules/KickSynthEdit.vue';
import ChannelSelector from './ChannelSelector.vue';
import { useExclusiveContentsStore } from '../store/exclusiveContentsStore';
import OtherAudioModules from './editModules/OtherAudioModules.vue';

const props = defineProps<{
    audioModule: AudioModule
}>();

const kick = computed<KickSynth | undefined>(() => {
    if (props.audioModule instanceof KickSynth) {
        return props.audioModule;
    }
    return undefined;
});

</script>
<template>
    <KickSynthEdit v-if="kick" :audioModule="kick" />
    <OtherAudioModules v-else :audioModule="audioModule" />
</template>