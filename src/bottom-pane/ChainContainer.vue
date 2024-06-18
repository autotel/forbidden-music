<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { SynthChain } from '../dataStructures/SynthChain';
import { PlaceholderSynth } from '../synth/PlaceholderSynth';
import AudioModuleContainer from './editModules/AudioModuleContainer.vue';
import AddSynth from './components/AddSynth.vue';
import StackContainer from './editModules/StackContainer.vue';
import { isStack } from '../dataStructures/SynthStack';

const props = defineProps<{
    synthChain: SynthChain
}>();

const stepsArray = ref(props.synthChain.chain);

const chainChangedHandler = () => {
    stepsArray.value = [...props.synthChain.chain];
    props.synthChain.rewire();
}

watch(() => props.synthChain, (newVal, oldVal) => {
    console.log('props.synthChain.chain changed', newVal, oldVal);
    oldVal.removeChangeListener(chainChangedHandler);
    newVal.addChangeListener(chainChangedHandler);
    chainChangedHandler();
});

onMounted(() => {
    props.synthChain.addChangeListener(chainChangedHandler);
    chainChangedHandler();
});

</script>

<template>
    <template v-for="(step, i) in stepsArray">
        <template v-if="!(step instanceof PlaceholderSynth)">
            <AddSynth :position="i" :targetChain="synthChain" />
            <StackContainer v-if="isStack(step)" :stack="step" :remove="() => synthChain.removeAudioModuleAt(i)" />
            <AudioModuleContainer v-else :audioModule="step" :remove="() => synthChain.removeAudioModuleAt(i)" />
        </template>
    </template>
    <AddSynth :position="stepsArray.length" :targetChain="synthChain" />

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