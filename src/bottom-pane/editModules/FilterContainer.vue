<script setup lang="ts">

import { FilterEffect } from '@/synth/effects/FilterEffect';
import { Ref, computed, inject } from 'vue';
import { useMonoModeInteraction } from '@/store/monoModeInteraction';
import { ParamType } from '@/synth/types/SynthParam';
import Button from '@/components/Button.vue';
import BooleanSynthParam from '../components/BooleanSynthParam.vue';
import NumberArraySynthParam from '../components/NumberArraySynthParam.vue';
import NumberSynthParam from '../components/NumberSynthParam.vue';
import OptionSynthParam from '../components/OptionSynthParam.vue';

const props = defineProps<{
    audioModule: FilterEffect
}>();
const infoTextModal = inject<Ref<string>>('modalText');
const monoModeInteraction = useMonoModeInteraction();

const showInfo = (info: string) => {
    if (!infoTextModal) throw new Error('infoTextModal not injected');
    infoTextModal.value = info;
    monoModeInteraction.activate("credits modal");
}
const rows = () => {
    return Math.ceil(props.audioModule.params.length / 4);
}
const width = computed(() => {
    return (rows() * 4) + 'em';
});

</script>
<template>
    <div :style="{ width }" class="layout">
        <template v-for="param in audioModule.params">
            <NumberSynthParam v-if="param.type === ParamType.number" :param="param" />
            <BooleanSynthParam v-else-if="param.type === ParamType.boolean" :param="param" />
            <OptionSynthParam v-else-if="param.type === ParamType.option && param.options.length > 1" :param="param" />
            <NumberArraySynthParam v-else-if="param.type === ParamType.nArray" :param="param" />
        </template>
        <Button style="background-color: #ccc1;" v-if="audioModule.credits" @click="showInfo(audioModule.credits)"
            class="credits-button">Info</Button>
    </div>
</template>
<style scoped>
.layout {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    height: 100%;
    flex-wrap: wrap;
    padding: 0.9em;
}
</style>