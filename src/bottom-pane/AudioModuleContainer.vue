<script setup lang="ts">
import { computed } from 'vue';
import Button from '../components/Button.vue';
import { ChainStep, SynthChain } from '../dataStructures/SynthChain';
import { SynthStack, isStack } from '../dataStructures/SynthStack';
import { useBottomPaneStateStore } from '../store/bottomPaneStateStore';
import { useSynthStore } from '../store/synthStore';
import { KickSynth } from '../synth/KickSynth';
import { PlaceholderSynth } from '../synth/PlaceholderSynth';
import { AudioModule } from '../synth/interfaces/AudioModule';
import ModuleContainer from './components/ModuleContainer.vue';
import KickSynthEdit from './editModules/KickSynthEdit.vue';
import OtherAudioModules from './editModules/OtherAudioModules.vue';
import StackContainer from './editModules/StackContainer.vue';
import SynthReplace from './editModules/SynthReplace.vue';

const props = defineProps<{
    audioModule: AudioModule,
    remove?: () => void,
}>();

const title = computed<string>(()=>{
    if ('name' in props.audioModule) {
        return props.audioModule.name + '';
    } else if (isStack(props.audioModule)) {
        return 'Parallel Chain';
    } else {
        return '???';
    }
});

const getComponentFor = (audioModule: AudioModule) => {
    if (audioModule instanceof PlaceholderSynth) {
        return SynthReplace;
    } else if (audioModule instanceof KickSynth) {
        return KickSynthEdit;
    } else {
        return OtherAudioModules;
    }
}

const handleRemoveClick = () => {
    if (props.remove) return props.remove();
    throw new Error('no remove handler');
}

</script>
<template>
    <ModuleContainer v-if="audioModule" :title="title">
        <template #icons>
            <Button v-if="props.remove" danger :onClick="handleRemoveClick" tooltip="delete"
                style="background-color:transparent">×</Button>
        </template>
        <template #default>
            <component :is="getComponentFor(audioModule)" :audioModule="audioModule" />
        </template>
    </ModuleContainer>
</template>