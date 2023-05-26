<script setup lang="ts">
import { inject, reactive, Ref, ref, watch } from "vue";
import { usePlaybackStore } from "../store/playbackStore";
import { ParamType } from "../synth/SynthInterface";
import Button from "./Button.vue";
import EdgeHidableWidget from "./EdgeHidableWidget.vue";
import PropOption from "./PropOption.vue";
import PropSlider from './PropSlider.vue';
import HeartPulse from "./icons/HeartPulse.vue";
import { useMonoModeInteraction } from "../store/monoModeInteraction";
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
                        <Button v-if="param.type === ParamType.infoText"
                            :on-click="()=>showInfo(param.getter())">{{ param.displayName }}</Button>
                    </template>
                </div>
            </Suspense>
            <Button v-if="playback.synth?.credits" :on-click="showCurrentSynthCredits">Credits</Button>
        </div>
    </EdgeHidableWidget>
</template>
