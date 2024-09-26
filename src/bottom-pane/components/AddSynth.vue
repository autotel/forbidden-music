<script setup lang="ts">

import { computed, ref, watchEffect } from 'vue';
import Button from '@/components/Button.vue';
import { useBottomPaneStateStore } from '@/store/bottomPaneStateStore';
import {  useSynthStore } from '@/store/synthStore';
import SynthSelector from '../SynthSelector.vue';
import { SynthChain } from '@/dataStructures/SynthChain';
import { SynthStack } from '@/dataStructures/SynthStack';
import { useAudioContextStore } from '@/store/audioContextStore';
import { SynthConstructorWrapper } from '@/synth/getSynthConstructors';
const props = defineProps<{
    position: number
    targetChain: SynthChain
    forceExpanded?: boolean
}>();
const synth = useSynthStore();
const audioContextStore = useAudioContextStore();
const expanded = ref(false);
const bottomPaneState = useBottomPaneStateStore();
const mainContainer = ref<HTMLDivElement | null>(null);
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
const dropPatcheable = () => {
    if(!bottomPaneState.patcheableBeingDragged) throw new Error('No patcheableBeingDragged');
    const {patcheable, removeCallback} = bottomPaneState.patcheableBeingDragged;
    if(draggingPatcheableOver.value){
        removeCallback();
        props.targetChain.addAudioModule(
            props.position,
            patcheable,
        );
    }
    bottomPaneState.patcheableBeingDragged = false;
}

const draggingPatcheableOver = ref(false);

const patcheableDragoverHandler = () => {
    draggingPatcheableOver.value = true;
}
const patcheableDragOutHandler = () => {
    draggingPatcheableOver.value = false;
}


const activatePatchDragEvents = () => {
    if(!mainContainer.value) return;
    mainContainer.value.addEventListener('mouseenter', patcheableDragoverHandler);
    mainContainer.value.addEventListener('mouseleave', patcheableDragOutHandler);
    mainContainer.value.addEventListener('mouseup', dropPatcheable);
}
const deactivatePatchDragEvents = () => {
    if(!mainContainer.value) return;
    mainContainer.value.removeEventListener('mouseenter', patcheableDragoverHandler);
    mainContainer.value.removeEventListener('mouseleave', patcheableDragOutHandler);
    mainContainer.value.removeEventListener('mouseup', dropPatcheable);
    draggingPatcheableOver.value = false;
}

watchEffect(()=>{
    if(bottomPaneState.patcheableBeingDragged){
        console.log('activatePatchDragEvents');
        activatePatchDragEvents();
    }else{
        deactivatePatchDragEvents();
    }
})

</script>
<template>
    <div class="main-container" :class="{draggingPatcheableOver}" ref="mainContainer">
        <div class="icons-container" v-if="!forceExpanded">
            <Button 
                style="background-color: transparent;"    
                @click="expanded=!expanded"
            >{{expanded?'×':'+'}}
            </Button>
        </div>
        <div class="selector-container" v-if="expanded || forceExpanded">
            <SynthSelector @select="addSynth" />
            <h3 class="padded">Patch</h3>
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
    opacity: 0.4;
}
.main-container:hover{
    opacity: 1;
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
    width: 100%;
}
.main-container.draggingPatcheableOver{
    background-color: #00a2ffc0;
    border-radius: 5px;
}
.main-container.draggingPatcheableOver *{
    color: white;
}
</style>