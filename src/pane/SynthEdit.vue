<script setup lang="ts">
import { inject, onBeforeUnmount, onUnmounted, reactive, Ref, ref, watch } from "vue";
import { usePlaybackStore } from "../store/playbackStore";
import { ParamType } from "../synth/SynthInterface";
import Button from "../components/Button.vue";
import Collapsible from "./Collapsible.vue";
import PropOption from "../components/paramEditors/PropOption.vue";
import PropSlider from '../components/paramEditors/PropSlider.vue';
import HeartPulse from "../components/icons/HeartPulse.vue";
import { useMonoModeInteraction } from "../store/monoModeInteraction";
import NumberArrayEditor from "../components/paramEditors/NumberArrayEditor.vue";
import { onMounted } from "vue";
import PropLoadingProgress from "../components/paramEditors/PropLoadingProgress.vue";
const playback = usePlaybackStore();
const audioReady = ref(false);
const infoTextModal = inject<Ref<string>>('modalText');
const monoModeInteraction = useMonoModeInteraction();

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


</script>
<template>
    <Collapsible>
        <template #icon>
            <HeartPulse clas="icon" />
            synth params
        </template>
        <div>
            <div v-if="audioReady" class="controls-container">
                <template v-for="synthChan in playback.synths">
                    <PropOption :param="playback.synthSelector(synthChan)" />
                    <span><input type="number" v-model="synthChan.layer" /> Assign to layer</span>
                    <template v-for="param in synthChan.params">
                        <PropOption v-if="param.type === ParamType.option" :param="param" />
                        <PropSlider v-if="param.type === ParamType.number" :param="param" />
                        <PropLoadingProgress v-if="param.type === ParamType.progress" :param="param" />
                        <NumberArrayEditor v-if="param.type === ParamType.nArray" :param="param" />
                        <Button v-if="param.type === ParamType.infoText" :on-click="() => showInfo(param.value)">{{
                            param.displayName }}</Button>
                    </template>
                    <Button v-if="synthChan.synth.credits"
                        :on-click="() => showCredits(synthChan.synth.credits!)">Credits</Button>
                </template>
                <br><br>
                <Button :on-click="() => { playback.addSynth() }"> Add synth </Button>
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
</style>