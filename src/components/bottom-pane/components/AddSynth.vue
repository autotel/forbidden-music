<script setup lang="ts">

import { ref } from 'vue';
import Button from '../../../components/Button.vue';
import { useBottomPaneStateStore } from '../../../store/bottomPaneStateStore';
import { SynthConstructorWrapper, useSynthStore } from '../../../store/synthStore';
import SynthSelector from '../SynthSelector.vue';
import { SynthChain } from '../../../dataStructures/SynthChain';
import { SynthStack } from '../../../dataStructures/SynthStack';
import { useAudioContextStore } from '../../../store/audioContextStore';
const props = defineProps<{
    position: number
    targetChain: SynthChain
    forceExpanded?: boolean
}>();
const synth = useSynthStore();
const audioContextStore = useAudioContextStore();
const expanded = ref(false);
const bottomPaneState = useBottomPaneStateStore();
const addSynth = (synthCon: SynthConstructorWrapper) => {
    const newSynth = synth.instanceAudioModule(synthCon);
    props.targetChain.addAudioModule(
        props.position,
        newSynth
    );
    expanded.value = false;
}
const addRack = () => {
    const newStack = new SynthStack(audioContextStore.audioContext);
    props.targetChain.addAudioModule(
        props.position,
        newStack,
    );
    newStack.addChain();
    expanded.value = false;
}
</script>
<template>
    <div class="main-container">
        <div class="icons-container" v-if="!forceExpanded">
            <Button 
                style="background-color: transparent;"    
                @click="expanded=!expanded"
            >{{expanded?'×':'+'}}
            </Button>
        </div>
        <div class="selector-container" v-if="expanded || forceExpanded">
            <SynthSelector @select="addSynth" />

            <Button :onClick="addRack"
                style="width:calc(100% - 2em); display:flex; justify-content: space-between;" class="padded">
                Parallel rack
            </Button>
        </div>
    </div>
</template>
<style scoped>
.main-container {
    width:auto;
    background-color: transparent;
    position:relative;
    height:18em;
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-content: flex-start;
}
.icons-container {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    height:18em;
    justify-content: center;
    width: 1em;
    flex-grow: 0;
    flex-shrink:0;
}
.selector-container{
    display: inline-block;
    overflow-y: auto;
    flex-grow: 0;
    flex-shrink:0;
    height:18em;
}
</style>