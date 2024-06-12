<script setup lang="ts">

import { ref } from 'vue';
import { useBottomPaneStateStore } from '../../store/bottomPaneStateStore';
import { SynthConstructorWrapper, useSynthStore } from '../../store/synthStore';
import SynthSelector from '../SynthSelector.vue';
import ModuleContainer from './ModuleContainer.vue';
import Button from '../../components/Button.vue';
const synthStore = useSynthStore();
const expanded = ref(false);
const bottomPaneState = useBottomPaneStateStore();
const addSynth = (synth: SynthConstructorWrapper) => {
    console.log('replacing synth', synth);
    synthStore.addAudioModule(
        bottomPaneState.activeLayerChannel,
        synth
    );
}
</script>
<template>
    <ModuleContainer title="Add" :style="{width:expanded?'12em':0, backgroundColor: 'transparent'}">
        <template #icons>
            <Button 
                style="background-color: transparent;"    
                @click="expanded=!expanded"
            >{{expanded?'×':'+'}}
            </Button>
        </template>
        <template #default>
            <div style="height:100%; overflow-y: auto;">
                <SynthSelector @select="addSynth" />
            </div>
        </template>
    </ModuleContainer>
</template>