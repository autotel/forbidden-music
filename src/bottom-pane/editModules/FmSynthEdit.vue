<script setup lang="ts">

import { FmSynth } from '@/synth/generators/FmSynth';
import { Ref, computed, inject, ref } from 'vue';
import { useMonoModeInteraction } from '@/store/monoModeInteraction';
import Button from '@/components/Button.vue';
import NumberSynthParam from '../components/NumberSynthParam.vue';
import isDev from '@/functions/isDev';
import { filterMap } from '@/functions/filterMap';
import { abbreviate } from '@/functions/abbreviate';
import OptionSynthParam from '../components/OptionSynthParam.vue';
const props = defineProps<{
    audioModule: FmSynth
}>();
const infoTextModal = inject<Ref<string>>('modalText');
const monoModeInteraction = useMonoModeInteraction();

const showInfo = (info: string) => {
    if (!infoTextModal) throw new Error('infoTextModal not injected');
    infoTextModal.value = info;
    monoModeInteraction.activate("credits modal");
}

const printPreset = () => {
    let obj: { [key: string]: number } = {};
    props.audioModule.workletParams?.forEach((param) => {
        obj[param.displayName] = param.value;
    });
}

const groups = computed(() => [
    props.audioModule.workletParams?.slice(20) || [],
    props.audioModule.workletParams?.slice(0, 16) || [],
    props.audioModule.workletParams?.slice(16, 20) || [],
]);

const colLabels = computed(() =>
    groups.value.map((gr) => filterMap(gr, (p, i) => {
        if (i >= gr.length / 4) return false;
        const str = p.displayName.split('.').pop();
        if (!str) return '.';
        return abbreviate(str, 8);
    }))
);

// this is a workaround for a bug:
// knobs are not updated upon loading a preset
// two-faced interface forces redraw of knobs between preset changes
const presetsMode = ref(true);


</script>
<template>
    <div style="width:52em" class="layout">

        <template v-if="!presetsMode" v-for="(group, k) in groups">
            <div v-if="group" class="group" :style="`width: ${4 * group.length / 4}em`">

                <template v-for="(label, l) in colLabels[k]">
                    <p class="colLabel">{{ label }}</p>
                </template>
                <template v-for="(param, l) in group">
                    <NumberSynthParam :param="param" no-label />
                </template>
            </div>
        </template>

        <div class="group"
            style="flex-direction: column; align-items: flex-end; justify-content: end; height: 100%">
            
            <Button @click="showInfo(audioModule.credits)" class="credits-button">worklet credits </Button>
            <Button v-if="isDev()" @click="printPreset" class="credits-button">print preset</Button>
            <div style="display:block;" v-if="presetsMode">
                <OptionSynthParam style="width:10em;" :param="audioModule.presetSynthParam" />
            </div>
            <Button 
                @click="presetsMode = !presetsMode" class="credits-button"
            >
                {{ presetsMode ? 'edit' : 'presets' }}
            </Button>
        </div>
    </div>
</template>
<style scoped>
.group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    /* background-color: rgba(177, 176, 176, 0.1); */
    /* border:solid 1px; */
    flex-wrap: wrap;
    border-radius: 1em;
    margin: 0 0.5em;
    height: 5em;
}

.group .title {
    position: absolute;
    display: block;
    height: 100%;
    width: 1.5em;
    left: 0;
    /* mix-blend-mode: difference; */
}

.group .title p {
    position: absolute;
    text-align: center;
    /* width: 100%;
    white-space: nowrap;
    bottom:0;
    left:0;
    transform:  translate(1em, 0) rotate(-90deg);
    transform-origin:bottom left;
    background-color: rgba(153, 153, 153, 0.938);
    color: rgba(255, 255, 255, 0.603);
    padding: 0 0.5em; */
}

.layout {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    height: 100%;
}

.colLabel {
    text-align: left;
    width: 4em;
    height: 4em;
    transform: rotate(-45deg);
    transform-origin: top right;
}
</style>