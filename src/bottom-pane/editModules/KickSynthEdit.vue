<script setup lang="ts">

import ModuleContainer from '../components/ModuleContainer.vue';
import Knob from '../components/Knob.vue';
import { usePlaybackStore } from '../../store/playbackStore';
import { useSynthStore } from '../../store/synthStore';
import { onBeforeMount, ref } from 'vue';
import { ParamType } from '../../synth/interfaces/SynthParam';
import { KickSynth } from '../../synth/KickSynth';

defineProps<{
    audioModule: KickSynth
}>();
</script>
<template>
    <div style="display: flex;flex-direction: column; align-items: center;">
        <template v-for="param in audioModule.params">
            <Knob v-if="param.type === ParamType.number" :param="param" />
        </template>
    </div>
</template>