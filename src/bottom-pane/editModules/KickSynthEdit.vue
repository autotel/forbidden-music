<script setup lang="ts">

import { KickSynth } from '../../synth/KickSynth';
import { ParamType } from '../../synth/interfaces/SynthParam';
import Knob from '../components/Knob.vue';

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