<script setup lang="ts">
import { inject, reactive, Ref, ref, watch } from "vue";
import { usePlaybackStore } from "../store/playbackStore";
import { ParamType } from "../synth/SynthInterface";
import Button from "../components/Button.vue";
import EdgeHidableWidget from "./EdgeHidableWidget.vue";
import PropOption from "../components/paramEditors/PropOption.vue";
import PropSlider from '../components/paramEditors/PropSlider.vue';
import HeartPulse from "../components/icons/HeartPulse.vue";
import { useMonoModeInteraction } from "../store/monoModeInteraction";
import NumberArrayEditor from "../components/paramEditors/NumberArrayEditor.vue";
import { onMounted } from "vue";
const playback = usePlaybackStore();

const infoTextModal = inject<Ref<string>>('modalText');
const monoModeInteraction = useMonoModeInteraction();

const showCurrentSynthCredits = () => {
    if (!infoTextModal) throw new Error('infoTextModal not injected');
    if (playback.synth?.credits) {
        infoTextModal.value = playback.synth.credits;
        monoModeInteraction.activate("credits modal");
    }
}
const showInfo = (info: string) => {
    if (!infoTextModal) throw new Error('infoTextModal not injected');
    infoTextModal.value = info;
    monoModeInteraction.activate("credits modal");
}
onMounted(()=>{
    console.log('mounted synth edit', playback.synthParams);
})
</script>
<template>
    <EdgeHidableWidget id="synthParamsWindow">
        <template #icon>
            <HeartPulse />
        </template>
        <h2>synth params</h2>
        <div style="height:4em">
            <Suspense>
                <template #fallback>
                    <Button :on-click="() => { }">Click to start audio engine</Button>
                </template>
                <div>

                    <template v-for="param in playback.synthParams">
                        <PropOption v-if="param.type === ParamType.option" :param="param" />
                        <PropSlider v-if="param.type === ParamType.number" :param="param" />
                        <NumberArrayEditor v-if="param.type === ParamType.nArray" :param="param" />
                        <Button v-if="param.type === ParamType.infoText"
                            :on-click="()=>showInfo(param.value)">{{ param.displayName }}</Button>
                    </template>
                </div>
            </Suspense>
            <Button v-if="playback.synth?.credits" :on-click="showCurrentSynthCredits">Credits</Button>
        </div>
    </EdgeHidableWidget>
</template>
