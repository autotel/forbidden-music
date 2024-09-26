<script setup lang="ts">

import Button from '@/components/Button.vue';
import { useMonoModeInteraction } from '@/store/monoModeInteraction';
import { Sampler } from '@/synth/generators/Sampler';
import { ParamType } from '@/synth/types/SynthParam';
import { Ref, inject, ref } from 'vue';
import BooleanSynthParam from '../components/BooleanSynthParam.vue';
import NumberArraySynthParam from '../components/NumberArraySynthParam.vue';
import NumberSynthParam from '../components/NumberSynthParam.vue';
import OptionSynthParam from '../components/OptionSynthParam.vue';
import SampleKitSelector from '../components/SampleKitSelector.vue';
import SampleMapDisplay from '../components/SampleMapDisplay.vue';
import AnglesRight from '@/components/icons/AnglesRight.vue';
import AnglesLeft from '@/components/icons/AnglesLeft.vue';

const props = defineProps<{
    audioModule: Sampler
}>();

await props.audioModule.waitReady;

const showKitSelector = ref(false);
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
        <div 
            :class="{
                kitbutton: true,
                expanded: showKitSelector
            }"
        >
            <Button
                tooltip="Change instrument's sound (i.e. sample kit)"
                @click="showKitSelector = !showKitSelector" >
                <AnglesLeft v-if="showKitSelector"/>
                <AnglesRight v-else /> Kit
            </Button>
        </div>
        <template v-if="showKitSelector">
            <SampleKitSelector :audioModule="audioModule" :types="['chromatic', 'atonal']" />
            <SampleMapDisplay :audioModule="audioModule" />
        </template>
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
.kitbutton {
    position: relative;
    height: 100%;
    width: 0;
}
.kitbutton.expanded {
    width: 1.5em;
}
.kitbutton>*{
    bottom:0px;
    position: absolute;
    left: 0px;
    bottom:0px;
    backdrop-filter: blur(2px);
}
.kitbutton.expanded>* {
    box-shadow: 3px 0px 3px #00000033
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