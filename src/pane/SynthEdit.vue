<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onUnmounted, reactive, Ref, ref, watch } from "vue";
import { SynthChannel, usePlaybackStore } from "../store/playbackStore";
import { ParamType, SynthInstance } from "../synth/SynthInterface";
import Button from "../components/Button.vue";
import Collapsible from "./Collapsible.vue";
import PropOption from "../components/paramEditors/PropOption.vue";
import PropSlider from '../components/paramEditors/PropSlider.vue';
import HeartPulse from "../components/icons/HeartPulse.vue";
import { useMonoModeInteraction } from "../store/monoModeInteraction";
import NumberArrayEditor from "../components/paramEditors/NumberArrayEditor.vue";
import { onMounted } from "vue";
import PropLoadingProgress from "../components/paramEditors/PropLoadingProgress.vue";
import { useToolStore } from "../store/toolStore";
import { useLayerStore } from "../store/layerStore";
import { nextTick } from "process";
import { layerNoteColorStrings } from "../store/viewStore";
import { useCustomSettingsStore } from "../store/customSettingsStore";
const playback = usePlaybackStore();
const audioReady = ref(false);
const infoTextModal = inject<Ref<string>>('modalText');
const monoModeInteraction = useMonoModeInteraction();
const userSettings = useCustomSettingsStore();
const tool = useToolStore();
const layers = useLayerStore();
const showCredits = (credits: string) => {
    if (!infoTextModal) throw new Error('infoTextModal not injected');
    infoTextModal.value = credits;
    monoModeInteraction.activate("credits modal");
}

const showInfo = (info: string) => {
    if (!infoTextModal) throw new Error('infoTextModal not injected');
    infoTextModal.value = info;
    monoModeInteraction.activate("credits modal");
}

onMounted(() => {
    playback.audioContextPromise.then(() => {
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
    ()=>layers.layers[tool.currentLayerNumber]?.channelSlot
], setActiveLayerChanToCurrentLayerTarget);

onMounted(()=>playback.audioContextPromise.then(() => {
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

                    <Button 
                        :onClick="() => activeLayerChan = synthChan" 
                        :active="synthChan===activeLayerChan" 
                        style="width:100%; text-align:left; margin-left: 2em"
                        :active-color="layerNoteColorStrings[1]"
                        >
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
                    <template v-for="param in activeLayerChan.params">
                        <PropOption v-if="param.type === ParamType.option" :param="param" />
                        <PropSlider v-if="param.type === ParamType.number" :param="param" />
                        <PropLoadingProgress v-if="param.type === ParamType.progress" :param="param" />
                        <NumberArrayEditor v-if="param.type === ParamType.nArray" :param="param" />
                        <Button v-if="param.type === ParamType.infoText" :on-click="() => showInfo(param.value)">{{
                            param.displayName }}</Button>
                    </template>
                    <Button v-if="activeLayerChan.synth.credits"
                        :on-click="() => activeLayerChan ? showCredits(activeLayerChan.synth.credits!) : null">
                        Credits
                    </Button>
                </template>
                <br><br>
                <Button v-if="userSettings.polyphonyEnabled" :on-click="() => { playback.addChannel() }"> Add synth </Button>
            </div>
            <div v-else>
                <Button :on-click="() => { playback.retryAudioContext() }">Click to start audio engine</Button>
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

    position:relative;
    left: -1.5em;
}
</style>