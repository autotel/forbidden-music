<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import Button from '../../components/Button.vue';
import { SynthChain } from '../../dataStructures/SynthChain';
import { SynthStack } from '../../dataStructures/SynthStack';
import { PatcheableTrait, PatcheableType } from '../../dataTypes/PatcheableTrait';
import { KickSynth } from '../../synth/KickSynth';
import { PatcheableSynth } from '../../synth/PatcheableSynth';
import { ThingyScoreFx } from '../../synth/scoreEffects/Thingy';
import ModuleContainer from './components/ModuleContainer.vue';
import KickSynthEdit from './editModules/KickSynthEdit.vue';
import OtherAudioModules from './editModules/OtherAudioModules.vue';
import PatcheableSynthEdit from './editModules/PatcheableSynthEdit.vue';
import ThingyEdit from './editModules/ThingyEdit.vue';
import AddSynth from './components/AddSynth.vue';
import StackContainer from './editModules/StackContainer.vue';
import { AudioModule } from '../../synth/interfaces/AudioModule';
import { PatcheableSynthVoice, Synth } from '../../synth/super/Synth';

const props = defineProps<{
    synthChain: SynthChain
}>();

const stepsArray = ref(props.synthChain.chain);

const chainChangedHandler = () => {
    stepsArray.value = [...props.synthChain.chain];
    props.synthChain.rewire();
}

watch(() => props.synthChain, (newVal, oldVal) => {
    oldVal.removeChangeListener(chainChangedHandler);
    newVal.addChangeListener(chainChangedHandler);
    chainChangedHandler();
});

const confirm = (message: string) => {
    return window.confirm(message);
}

onMounted(() => {
    props.synthChain.addChangeListener(chainChangedHandler);
    chainChangedHandler();
});

const xClickHandler = (synthChain: SynthChain, index: number) => {
    if (!confirm(`Are you sure you want to delete this ${synthChain.chain[index].name} module?`)) {
        return;
    }
    synthChain.removeAudioModuleAt(index);
}
const isAudioModule = (audioModule: PatcheableTrait): audioModule is Synth => {
    return audioModule.patcheableType === PatcheableType.AudioModule
}
const isAudioVoiceModule = (audioModule: PatcheableTrait): audioModule is PatcheableSynthVoice => {
    return audioModule.patcheableType === PatcheableType.AudioVoiceModule
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
                <ThingyEdit v-else-if="(audioModule instanceof ThingyScoreFx)" :audioModule="audioModule" />
                <PatcheableSynthEdit v-else-if="(audioModule instanceof PatcheableSynth)" :audioModule="audioModule" />
                <OtherAudioModules v-else-if="isAudioModule(audioModule)" :audioModule="audioModule" />
                <!-- <PatcheableSynth v-else-if="isAudioVoiceModule(audioModule)" :audioModule="audioModule" /> -->
                <!-- <OtherAudioModules v-else-if="audioModule instanceof Synth" :audioModule="audioModule" /> -->
                <p v-else style="color: red;">Unknown module type</p>
            </template>
        </ModuleContainer>

        <p v-else style="color: red;">Unknown module type</p>
    </template>
    <AddSynth :position="stepsArray.length" :targetChain="synthChain" :force-expanded="stepsArray.length === 0" />

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
    margin: 0.5em;
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