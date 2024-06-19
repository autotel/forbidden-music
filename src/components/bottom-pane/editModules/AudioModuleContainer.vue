<script setup lang="ts">
import { computed } from 'vue';
import Button from '../../../components/Button.vue';
import { isStack } from '../../../dataStructures/SynthStack';
import { KickSynth } from '../../../synth/KickSynth';
import { PlaceholderSynth } from '../../../synth/PlaceholderSynth';
import { AudioModule } from '../../../synth/interfaces/AudioModule';
import ModuleContainer from '../components/ModuleContainer.vue';
import KickSynthEdit from './KickSynthEdit.vue';
import ThingyEdit from './ThingyEdit.vue';
import OtherAudioModules from './OtherAudioModules.vue';
import { ThingyScoreFx } from '../../../synth/scoreEffects/Thingy';

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
    if (audioModule instanceof KickSynth) {
        return KickSynthEdit;
    } else if (audioModule instanceof ThingyScoreFx) {
        return ThingyEdit;
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