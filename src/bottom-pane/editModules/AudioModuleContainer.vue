<script setup lang="ts">
import { computed } from 'vue';
import { isStack } from '../../dataStructures/SynthStack';
import { KickSynth } from '../../synth/KickSynth';
import { PlaceholderSynth } from '../../synth/PlaceholderSynth';
import { AudioModule } from '../../synth/interfaces/AudioModule';
import Button from '../../components/Button.vue';
import KickSynthEdit from './KickSynthEdit.vue';
import ModuleContainer from '../components/ModuleContainer.vue';
import OtherAudioModules from './OtherAudioModules.vue';
import SynthReplace from './SynthReplace.vue';

const props = defineProps<{
    audioModule: AudioModule,
    remove?: () => void,
}>();

const title = computed<string>(() => {
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
    <ModuleContainer v-if="audioModule" :title="title" padding>
        <template #icons>
            <Button v-if="props.remove" danger :onClick="handleRemoveClick" tooltip="delete"
                style="background-color:transparent">×</Button>
        </template>
        <template #default>
            <component :is="getComponentFor(audioModule)" :audioModule="audioModule" />
        </template>
    </ModuleContainer>
</template>