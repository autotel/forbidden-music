<script setup lang="ts">
import Button from '../components/Button.vue';
import ButtonSub from '../components/ButtonSub.vue';
import { SynthChain } from '../dataStructures/SynthChain';
import { useBottomPaneStateStore } from '../store/bottomPaneStateStore';
import { useCustomSettingsStore } from '../store/customSettingsStore';
import { useSynthStore } from '../store/synthStore';
import { layerNoteColorStrings } from '../store/viewStore';

const bottomPaneStore = useBottomPaneStateStore();
const synth = useSynthStore();
const userSettings = useCustomSettingsStore();
const changeSynthChan = (chan: SynthChain) => {
    bottomPaneStore.activeLayerChannel = chan;
}
</script>
<template>
        <h3 class="padded">Synth chains</h3>
        <template v-for="(synthChan, chanNo) in synth.channels">
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

                <ButtonSub class="sub-button" :onClick="() => { synth.channels.splice(chanNo, 1) }">
                    ×
                </ButtonSub>
            </Button>
        </template>
        <Button v-if="userSettings.multiTimbralityEnabled" :on-click="() => { synth.addChannel() }" class="padded"
            tooltip="Add a new synth channel">
            + Channel
        </Button>
</template>