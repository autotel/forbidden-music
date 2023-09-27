<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, Ref, ref, watch } from "vue";
import Button from "../components/Button.vue";
import HeartPulse from "../components/icons/HeartPulse.vue";
import PropOption from "../components/paramEditors/PropOption.vue";
import { useAudioContextStore } from "../store/audioContextStore";
import { useCustomSettingsStore } from "../store/customSettingsStore";
import { useLayerStore } from "../store/layerStore";
import { useMonoModeInteraction } from "../store/monoModeInteraction";
import { SynthChannel, usePlaybackStore } from "../store/playbackStore";
import { useToolStore } from "../store/toolStore";
import { layerNoteColorStrings } from "../store/viewStore";
import Collapsible from "./Collapsible.vue";
import ParamsSliderList from "./ParamsSliderList.vue";
import { useEffectsStore } from "../store/effectsStore";

const infoTextModal = inject<Ref<string>>('modalText');
const monoModeInteraction = useMonoModeInteraction();
const playback = usePlaybackStore();
const effects = useEffectsStore();
const audioReady = ref(false);
const userSettings = useCustomSettingsStore();
const tool = useToolStore();
const layers = useLayerStore();
const audioContextStore = useAudioContextStore();
const showCredits = (credits: string) => {
    if (!infoTextModal) throw new Error('infoTextModal not injected');
    infoTextModal.value = credits;
    monoModeInteraction.activate("credits modal");
}


onMounted(() => {
    audioContextStore.audioContextPromise.then(() => {
        audioReady.value = true;
    })
})
onBeforeUnmount(() => {
    audioReady.value = false;
})



const activeLayerChan = ref<SynthChannel | null>();

const setActiveLayerChanToCurrentLayerTarget = () => {
    const activeLayer = tool.currentLayerNumber;
    const channel = layers.getLayerChannel(activeLayer);
    if (channel) {
        activeLayerChan.value = channel;
    } else {
        activeLayerChan.value = null;
    }
};

watch([
    // () => tool.currentLayerNumber, 
    () => layers.layers[tool.currentLayerNumber]?.channelSlot
], setActiveLayerChanToCurrentLayerTarget);

onMounted(() => audioContextStore.audioContextPromise.then(() => {
    setActiveLayerChanToCurrentLayerTarget();
}))

</script>
<template>
    <Collapsible tooltip="Change some parameters of the sound">
        <template #icon>
            <HeartPulse clas="icon" />
            Sounds
        </template>
        <div>
            <div v-if="audioReady" class="controls-container">
                <template v-if="userSettings.polyphonyEnabled" v-for="(synthChan, chanNo) in playback.channels">

                    <Button :onClick="() => activeLayerChan = synthChan" :active="synthChan === activeLayerChan"
                        style="width:100%; text-align:left; margin-left: 2em" :active-color="layerNoteColorStrings[1]">
                        <template v-if="chanNo === 0">
                            default -
                        </template>
                        <template v-else>
                            <span class="encircled">{{ chanNo }}</span>
                        </template>
                        {{ synthChan.synth.name }}
                    </Button>
                </template>

                <template v-if="activeLayerChan">
                    <PropOption :param="playback.synthSelector(activeLayerChan)" />
                    <ParamsSliderList :synthParams="activeLayerChan.params" />
                    <Button v-if="activeLayerChan.synth.credits"
                        :on-click="() => activeLayerChan ? showCredits(activeLayerChan.synth.credits!) : null">
                        Credits
                    </Button>
                </template>
                <br><br>
                <Button v-if="userSettings.polyphonyEnabled" :on-click="() => { playback.addChannel() }"> Add synth
                </Button>
                <template v-if="userSettings.effectsEnabled" v-for="effect in effects.effectsChain">
                    <h3>Master {{effect.name}}</h3>
                    <ParamsSliderList :synthParams="effect.params" />
                    <Button v-if="effect.credits"
                        :on-click="() => activeLayerChan ? showCredits(effect.credits!) : null">
                        Credits
                    </Button>
                </template>
            </div>
            <div v-else>
                <Button :on-click="() => { audioContextStore.retryAudioContext() }">Click to start audio engine</Button>
            </div>
        </div>
    </Collapsible>
</template>
<style scoped>
.controls-container {
    width: 100%;
    box-sizing: border-box;
}

.encircled {
    display: inline-flex;
    border-radius: 50%;
    background-color: rgb(31, 4, 95);
    color: white;
    /* border:solid 1.2px white; */
    font-weight: 800;
    justify-content: center;
    align-items: center;
    width: 1.5em;
    height: 1.5em;

    position: relative;
    left: -1.5em;
}
</style>