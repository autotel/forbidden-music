<script setup lang="ts">

import { Ref, computed, inject } from 'vue';
import { useMonoModeInteraction } from '../../../store/monoModeInteraction';
import { AudioModule } from '../../../synth/types/AudioModule';
import { ParamType } from '../../../synth/types/SynthParam';
import BooleanSynthParam from '../components/BooleanSynthParam.vue';
import NumberArraySynthParam from '../components/NumberArraySynthParam.vue';
import NumberSynthParam from '../components/NumberSynthParam.vue';
import OptionSynthParam from '../components/OptionSynthParam.vue';
import Button from '../../Button.vue';
import { ClassicSynth } from '@/synth/generators/ClassicSynth';

const props = defineProps<{
    audioModule: ClassicSynth
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

const groups = computed(() => [
    [
        props.audioModule.waveShapeParam,
        props.audioModule.gainParam,
    ], [
        props.audioModule.envelopes[0].attackParam,
        props.audioModule.envelopes[0].attackCurveParam,
        props.audioModule.envelopes[0].decayParam,
        props.audioModule.envelopes[0].sustainParam,
        props.audioModule.envelopes[0].releaseParam,
    ], [
        props.audioModule.envelopes[1].attackParam,
        props.audioModule.envelopes[1].attackCurveParam,
        props.audioModule.envelopes[1].decayParam,
        props.audioModule.envelopes[1].sustainParam,
        props.audioModule.envelopes[1].releaseParam,
    ], [
        props.audioModule.filterTypeParam,
        props.audioModule.filterOctaveParam,
        props.audioModule.filterQParam,
        props.audioModule.filterEnvParam,
    ]
]);

</script>
<template>
    <div style="width:36em" class="layout">
        <div class="group" style="">
            <OptionSynthParam :param="props.audioModule.waveShapeParam"  style="width:5em" />
            <NumberSynthParam :param="props.audioModule.gainParam" />
        </div>
        <div class="group" style="width:22em">
            <div class="title"><p>Filter</p></div>
            <OptionSynthParam :param="props.audioModule.filterTypeParam" style="width:8em"/>
            <NumberSynthParam :param="props.audioModule.filterOctaveParam" />
            <NumberSynthParam :param="props.audioModule.filterQParam" />
            <NumberSynthParam :param="props.audioModule.filterEnvParam" /> 
        </div>
        <div class="group" style="">
            <div class="title"><p>Amp Env</p></div>
            <NumberSynthParam :param="props.audioModule.envelopes[0].attackParam" />
            <NumberSynthParam :param="props.audioModule.envelopes[0].attackCurveParam" />
            <NumberSynthParam :param="props.audioModule.envelopes[0].decayParam" />
            <NumberSynthParam :param="props.audioModule.envelopes[0].sustainParam" />
            <NumberSynthParam :param="props.audioModule.envelopes[0].releaseParam" />
        </div>
        <div class="group" style="">
            <div class="title"><p>Filter Env</p></div>
            <NumberSynthParam :param="props.audioModule.envelopes[1].attackParam" />
            <NumberSynthParam :param="props.audioModule.envelopes[1].attackCurveParam" />
            <NumberSynthParam :param="props.audioModule.envelopes[1].decayParam" />
            <NumberSynthParam :param="props.audioModule.envelopes[1].sustainParam" />
            <NumberSynthParam :param="props.audioModule.envelopes[1].releaseParam" />
        </div>
        <Button style="background-color: #ccc1;" v-if="audioModule.credits" @click="showInfo(audioModule.credits)"
            class="credits-button">Info</Button>
    </div>
</template>
<style scoped>
.group {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(204, 204, 204, 0.473);
    border-radius: 1em;
    margin: 0 0.5em;
    height: 5em;
}
.group .title {
    position: relative;
    display: block;
    height: 100%;
    width: 1.5em;
    left:0;
    /* mix-blend-mode: difference; */
}
.group .title p {
    position: absolute;
    text-align: center;
    width: 5em;
    white-space: nowrap;
    bottom:0;
    left:0;
    transform:  translate(1em, 0) rotate(-90deg);
    transform-origin:bottom left;
    background-color: rgba(179, 179, 179, 0.938);
    color: rgba(255, 255, 255, 0.603);
    padding: 0 0.5em;
}
.layout {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: center;
    height: 100%;
}
</style>