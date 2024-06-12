<script setup lang="ts">
import { ref } from 'vue';
import PropOptionButtons from '../components/paramEditors/PropOptionButtons.vue';
import { SynthChannel, useSynthStore, SynthConstructorWrapper } from '../store/synthStore';
import { layerNoteColorStrings } from '../store/viewStore';
import { useCustomSettingsStore } from '../store/customSettingsStore';
import Button from '../components/Button.vue';
import ButtonSub from '../components/ButtonSub.vue';
const props = defineProps<{
    activeLayerChan: SynthChannel
}>();
const emit = defineEmits(['change:activeLayerChan']);
const synth = useSynthStore();
const isSynthReady = ref(false);
const isSupposedlyLoading = ref(false);
const userSettings = useCustomSettingsStore();
const instanceSynth = (scw: SynthConstructorWrapper) => {
    synth.addAudioModule(scw, props.activeLayerChan);
}
const changeSynthChan = (chan: SynthChannel) => {
    emit('change:activeLayerChan', chan);
}
</script>
<template>
    <div style="" class="col">
        <h3 class="padded">Synth chains</h3>
        <template v-for="(synthChan, chanNo) in synth.channels">
            <Button :onClick="() => changeSynthChan(synthChan)" :active="synthChan === activeLayerChan"
                style="width:calc(100% - 2em); display:flex; justify-content: space-between;"
                :style="chanNo ? 'padding-left:2em' : ''" :active-color="layerNoteColorStrings[1]" class="padded"
                :tooltip="`open synth control channel ${chanNo} (assigned in layers)`">
                <template v-if="chanNo === 0">
                    default -
                </template>
                <template v-else>
                    <span class="encircled">{{ chanNo }}</span>
                </template>
                {{ synthChan.chain[0]?.name }}

                <ButtonSub class="sub-button" :onClick="() => { synth.channels.splice(chanNo, 1) }">
                    ×
                </ButtonSub>
            </Button>
        </template>
        <Button v-if="userSettings.multiTimbralityEnabled" :on-click="() => { synth.addChannel() }" class="padded"
            tooltip="Add a new synth channel">
            + Channel
        </Button>
    </div>
    <div style="" class="col">
        <h3 class="padded">Synth select</h3>
        <template v-for="(scw, no) in synth.synthConstructorWrappers">
            <Button :onClick="() => instanceSynth(scw)"
                style="width:calc(100% - 2em); display:flex; justify-content: space-between;" class="padded">

                {{ scw.name }}

            </Button>
        </template>
    </div>
</template>
<style scoped>
.col {
    padding-top: 0.6em;
    height: 18em;
    width: 15em;
    overflow: auto;
    position: relative;
    /* display: flex; */
    /* flex-direction: column; */
    flex-grow: 0;
    flex-shrink: 0;
    /* display: inline-block; */
}
</style>