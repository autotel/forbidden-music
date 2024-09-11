<script setup lang="ts">

import Button from '@/components/Button.vue';
import { useMonoModeInteraction } from '@/store/monoModeInteraction';
import { Sampler } from '@/synth/generators/Sampler';
import { ParamType } from '@/synth/types/SynthParam';
import { Ref, inject } from 'vue';
import BooleanSynthParam from '../components/BooleanSynthParam.vue';
import NumberArraySynthParam from '../components/NumberArraySynthParam.vue';
import NumberSynthParam from '../components/NumberSynthParam.vue';
import OptionSynthParam from '../components/OptionSynthParam.vue';
import SampleKitSelector from '../components/SampleKitSelector.vue';
import SampleMapDisplay from '../components/SampleMapDisplay.vue';

const props = defineProps<{
    audioModule: Sampler
}>();

await props.audioModule.waitReady;

const infoTextModal = inject<Ref<string>>('modalText');
const monoModeInteraction = useMonoModeInteraction();

const showInfo = (info: string) => {
    if (!infoTextModal) throw new Error('infoTextModal not injected');
    infoTextModal.value = info;
    monoModeInteraction.activate("credits modal");
}

const width = 'auto';
</script>
<template>
    <div :style="{ width }" class="layout">
        <SampleKitSelector :audioModule="audioModule" :types="['chromatic']" />
        <SampleMapDisplay :audioModule="audioModule" />
        <div class="group" style="width: 10em">
            <template v-for="param in audioModule.params">
                <NumberSynthParam v-if="param.type === ParamType.number" :param="param" />
                <!-- <NumberSynthParam v-if="param.type === ParamType.progress" :param="param" /> -->
                <BooleanSynthParam v-else-if="param.type === ParamType.boolean" :param="param" />
                <OptionSynthParam v-else-if="param.type === ParamType.option && param.options.length > 1" :param="param"
                    style="width: 8em" />
                <NumberArraySynthParam v-else-if="param.type === ParamType.nArray" :param="param" />
            </template>
            <Button style="background-color: #ccc1;" v-if="audioModule.credits" @click="showInfo(audioModule.credits)"
                class="credits-button">Info</Button>
        </div>
    </div>
</template>
<style scoped>
.layout {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: center;
    height: 100%;
}

.group {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    margin: 0.5em;
}

.sample-selector {
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding-right: 12px;
}
</style>