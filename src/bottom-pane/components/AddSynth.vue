<script setup lang="ts">

import { ref } from 'vue';
import Button from '../../components/Button.vue';
import { useBottomPaneStateStore } from '../../store/bottomPaneStateStore';
import { SynthConstructorWrapper, useSynthStore } from '../../store/synthStore';
import SynthSelector from '../SynthSelector.vue';
const synthStore = useSynthStore();
const expanded = ref(false);
const bottomPaneState = useBottomPaneStateStore();
const addSynth = (synth: SynthConstructorWrapper) => {
    console.log('replacing synth', synth);
    synthStore.addAudioModule(
        bottomPaneState.activeLayerChannel,
        synth
    );
    expanded.value = false;
}
</script>
<template>
    <div :style="{
        width:expanded?'auto':'0.1em',
        backgroundColor: 'transparent',
        position:'relative',
        display:'flex',
        flexDirection:'row',
        height:'18em'
    }">
        <div id="icons">
            <Button 
                style="background-color: transparent;"    
                @click="expanded=!expanded"
            >{{expanded?'×':'+'}}
            </Button>
        </div>
        <div id="selector" v-if="expanded">
            <div style="height:100%; overflow-y: auto;">
                <SynthSelector @select="addSynth" />
            </div>
        </div>
    </div>
</template>
<style scoped>
#icons {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 0.05em;
    flex-grow: 0;
    flex-shrink:0;
}
#selector {
    overflow-y: auto;
    height: 100%;
    flex-grow: 0;
    flex-shrink:0;
}
</style>