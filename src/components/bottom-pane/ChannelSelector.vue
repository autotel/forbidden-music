<script setup lang="ts">
import { useToolStore } from '@/store/toolStore';
import Button from '../../components/Button.vue';
import ButtonSub from '../../components/ButtonSub.vue';
import { SynthChain } from '../../dataStructures/SynthChain';
import { useBottomPaneStateStore } from '../../store/bottomPaneStateStore';
import { useCustomSettingsStore } from '../../store/customSettingsStore';
import { useSynthStore } from '../../store/synthStore';
import { layerNoteColorStrings } from '../../store/viewStore';
import { useLayerStore } from '@/store/layerStore';

const bottomPaneStore = useBottomPaneStateStore();
const synth = useSynthStore();
const userSettings = useCustomSettingsStore();
const layerStore = useLayerStore();
const toolStore = useToolStore();

const findLayerIndexAssignedToChannel = (channelIndex: number) => {
    for (let i = 0; i < layerStore.layers.length; i++) {
        if (layerStore.layers[i].channelSlot === channelIndex) {
            return i;
        }
    }
    return -1;
}

const focusOnLayer = (layerIndex: number) => {
    toolStore.currentLayerNumber = layerIndex;
}

const changeSynthChan = (chan: SynthChain) => {
    bottomPaneStore.activeLayerChannel = chan;
    const channelIndex = synth.channels.children.indexOf(chan);
    const activeLayerNumber = toolStore.currentLayerNumber;
    if (layerStore.layers[activeLayerNumber].channelSlot !== channelIndex) {
        let layerIndexForChannel = findLayerIndexAssignedToChannel(channelIndex);
        if (layerIndexForChannel !== -1) {
            focusOnLayer(layerIndexForChannel);
        }
    }
}

const addChannel = () => {
    bottomPaneStore.activeLayerChannel = synth.channels.addChain();
    const channelIndex = synth.channels.children.indexOf(bottomPaneStore.activeLayerChannel);
    const layerAssignedToChannel = findLayerIndexAssignedToChannel(channelIndex);
    // since layer is assigned through associative number, there might be a layer already assigned.
    if (layerAssignedToChannel !== -1) {
        focusOnLayer(layerAssignedToChannel);
    } else {
        const newLayer = layerStore.addLayer();
        newLayer.channelSlot = channelIndex;
        focusOnLayer(layerStore.layers.indexOf(newLayer));
    }
}
</script>
<template>
    <h3 class="padded">Synth chains</h3>
    <template v-for="(synthChan, chanNo) in synth.channels.children">
        <Button :onClick="() => changeSynthChan(synthChan)" :active="synthChan === bottomPaneStore.activeLayerChannel"
            style="width:calc(100% - 2em); display:flex; justify-content: space-between;"
            :style="chanNo ? 'padding-left:2em' : ''" :active-color="layerNoteColorStrings[1]" class="padded"
            :tooltip="`open synth control channel ${chanNo} (assigned in layers)`">
            <template v-if="chanNo === 0">
                default -
            </template>
            <template v-else>
                <span class="encircled">{{ chanNo }}</span>
            </template>
            {{ synthChan.name }}

            <ButtonSub class="sub-button" danger :onClick="() => { synth.channels.children.splice(chanNo, 1) }">
                ×
            </ButtonSub>
        </Button>
    </template>
    <Button v-if="userSettings.multiTimbralityEnabled" :on-click="addChannel" class="padded"
        tooltip="Add a new synth channel">
        + Channel
    </Button>
</template>