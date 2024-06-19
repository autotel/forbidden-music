<script setup lang="ts">
import { computed } from 'vue';
import Button from '../../../components/Button.vue';
import { KickSynth } from '../../../synth/KickSynth';
import { PlaceholderSynth } from '../../../synth/PlaceholderSynth';
import { AudioModule } from '../../../synth/interfaces/AudioModule';
import ModuleContainer from '../components/ModuleContainer.vue';
import KickSynthEdit from './KickSynthEdit.vue';
import ThingyEdit from './ThingyEdit.vue';
import OtherAudioModules from './OtherAudioModules.vue';
import { ThingyScoreFx } from '../../../synth/scoreEffects/Thingy';

const props = defineProps<{
    audioModule: AudioModule,
    remove?: () => void,
}>();

</script>
<template>
</template>