<script setup lang="ts">

import { computed } from 'vue';
import { AudioModule } from '../../synth/interfaces/AudioModule';
import { ParamType } from '../../synth/interfaces/SynthParam';
import Knob from '../components/Knob.vue';
import ModuleContainer from '../components/ModuleContainer.vue';

const props = defineProps<{
    audioModule: AudioModule
}>();
const maxKnobsPerCol = 4;
const rows = computed(() => Math.ceil(props.audioModule.params.length / maxKnobsPerCol));
</script>
<template>
    <ModuleContainer v-if="audioModule" :title="audioModule.name" :rows="rows">
        <template v-for="param in audioModule.params">
            <Knob v-if="param.type === ParamType.number" :param="param" />
        </template>
    </ModuleContainer>
</template>