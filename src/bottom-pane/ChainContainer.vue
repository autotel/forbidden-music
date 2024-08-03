<script setup lang="ts">
import Button from '@/components/Button.vue';
import { SynthChain } from '@/dataStructures/SynthChain';
import { SynthStack } from '@/dataStructures/SynthStack';
import { PatcheableTrait, PatcheableType } from '@/dataTypes/PatcheableTrait';
import { AutoMaximizerEffect } from '@/synth/effects/AutoMaximizerEffect';
import { FilterEffect } from '@/synth/effects/FilterEffect';
import { ClassicSynth } from '@/synth/generators/ClassicSynth';
import { FmSynth } from '@/synth/generators/FmSynth';
import { FourierSynth } from '@/synth/generators/FourierSynth';
import { KickSynth } from '@/synth/generators/KickSynth';
import { PatcheableSynth } from '@/synth/generators/PatcheableSynth';
import { PerxThingy } from '@/synth/generators/PerxThingy';
import { OscilloScope } from '@/synth/scope/OscilloScope';
import { ThingyScoreFx } from '@/synth/scoreEffects/Thingy';
import { Synth } from '@/synth/types/Synth';
import { onMounted, ref, watch } from 'vue';
import AddSynth from './components/AddSynth.vue';
import ModuleContainer from './components/ModuleContainer.vue';
import AutoMaximizerEdit from './editModules/AutoMaximizerEdit.vue';
import ClassicSynthEdit from './editModules/ClassicSynthEdit.vue';
import FilterContainer from './editModules/FilterContainer.vue';
import FmSynthEdit from './editModules/FmSynthEdit.vue';
import FourierSynthEdit from './editModules/FourierSynthEdit.vue';
import KickSynthEdit from './editModules/KickSynthEdit.vue';
import OscilloScopeEdit from './editModules/OscilloScopeEdit.vue';
import OtherAudioModules from './editModules/OtherAudioModules.vue';
import PatcheableSynthEdit from './editModules/PatcheableSynthEdit.vue';
import PerxThingyEdit from './editModules/PerxThingyEdit.vue';
import StackContainer from './editModules/StackContainer.vue';
import ThingyEdit from './editModules/ThingyEdit.vue';

const props = defineProps<{
    synthChain: SynthChain
}>();

const stepsArray = ref(props.synthChain.children);

const chainChangedHandler = () => {
    stepsArray.value = [...props.synthChain.children];
    props.synthChain.rewire();
}

watch(() => props.synthChain, (newVal, oldVal) => {
    oldVal.removeChangeListener(chainChangedHandler);
    newVal.addChangeListener(chainChangedHandler);
    chainChangedHandler();
});

const confirm = (message: string) => {
    return true
}

onMounted(() => {
    props.synthChain.addChangeListener(chainChangedHandler);
    chainChangedHandler();
});

const xClickHandler = (synthChain: SynthChain, index: number) => {
    if (!confirm(`Are you sure you want to delete this ${synthChain.children[index].name} module?`)) {
        return;
    }
    synthChain.removeAudioModuleAt(index);
}
const isAudioModule = (audioModule: PatcheableTrait): audioModule is Synth => {
    return audioModule.patcheableType === PatcheableType.AudioModule
}

</script>

<template>
    <template v-for="(audioModule, i) in stepsArray">
        <AddSynth :position="i" :targetChain="synthChain" />
        <ModuleContainer v-if="audioModule" :title="audioModule.name + ''" padding>
            <template #icons>
                <Button danger :onClick="() => xClickHandler(synthChain, i)" tooltip="delete"
                    style="background-color:transparent">×</Button>
            </template>
            <template #default>
                <StackContainer v-if="(audioModule instanceof SynthStack)" :audioModule="audioModule" />
                <KickSynthEdit v-else-if="(audioModule instanceof KickSynth)" :audioModule="audioModule" />
                <PerxThingyEdit v-else-if="(audioModule instanceof PerxThingy)" :audioModule="audioModule" />
                <ThingyEdit v-else-if="(audioModule instanceof ThingyScoreFx)" :audioModule="audioModule" />
                <ClassicSynthEdit v-else-if="audioModule instanceof ClassicSynth" :audioModule="audioModule" />
                <FourierSynthEdit v-else-if="(audioModule instanceof FourierSynth)" :audioModule="audioModule" />
                <PatcheableSynthEdit v-else-if="(audioModule instanceof PatcheableSynth)" :audioModule="audioModule" />
                <FmSynthEdit v-else-if="(audioModule instanceof FmSynth)" :audioModule="audioModule" />
                <AutoMaximizerEdit v-else-if="audioModule instanceof AutoMaximizerEffect"
                    :audioModule="audioModule" />
                <OscilloScopeEdit v-else-if="audioModule instanceof OscilloScope"
                    :audioModule="audioModule" />
                <FilterContainer v-else-if="audioModule instanceof FilterEffect" :audioModule="audioModule" />
                <OtherAudioModules v-else-if="isAudioModule(audioModule)" :audioModule="audioModule" />
                <!-- <PatcheableSynth v-else-if="isAudioVoiceModule(audioModule)" :audioModule="audioModule" /> -->
                <!-- <OtherAudioModules v-else-if="audioModule instanceof Synth" :audioModule="audioModule" /> -->
                <p v-else style="color: red;">Unknown module type</p>
            </template>
        </ModuleContainer>

        <p v-else style="color: red;">Unknown module type</p>
    </template>
    <AddSynth :position="stepsArray.length" :targetChain="synthChain" />
    <!--:force-expanded="stepsArray.length === 0" -->

</template>
<style scoped>
#hrow-items {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-content: flex-start;
}

#hrow-items>* {
    display: inline-block;
    margin: 0.25em;
    vertical-align: top;
    flex-shrink: 0;
    flex-grow: 0;
    text-wrap: none;
}

#wrapper {
    box-sizing: border-box;
    display: block;
    width: 100vw;
    overflow: auto;
}
</style>