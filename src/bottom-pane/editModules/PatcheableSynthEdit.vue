<script setup lang="ts">

import { computed } from 'vue';
import { PatcheableSynth } from '@/synth/generators/PatcheableSynth';
import { ParamType } from '@/synth/types/SynthParam';
import NumberSynthParam from '../components/NumberSynthParam.vue';

const props = defineProps<{
    audioModule: PatcheableSynth
}>();

const rows = () => {
    return Math.ceil(props.audioModule.params.length / 4);
}
const width = computed(() => {
    return (rows() * 4) + 'em';
});

</script>
<template>
    <div :style="{width}" class="knob-layout">
        ptjer
        <template v-for="param in audioModule.params">
            <NumberSynthParam v-if="param.type === ParamType.number" :param="param" />
            <p v-if="param.type === ParamType.voicePatch" :param="param" >
                <template v-for="voice in param.value">
                    <p>{{ voice.type }}</p>
                </template>
            </p>
            <p v-else>{{ param.displayName }}: {{ param.value }}</p>
        </template>
    </div>
</template>
<style scoped>
.knob-layout {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: center;
    height: 100%;
}
</style>