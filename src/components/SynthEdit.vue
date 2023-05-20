<script setup lang="ts">
import { inject, reactive, Ref, ref, watch } from "vue";
import { usePlaybackStore } from "../store/playbackStore";
import { ParamType } from "../synth/SynthInterface";
import Button from "./Button.vue";
import EdgeHidableWidget from "./EdgeHidableWidget.vue";
import PropOption from "./PropOption.vue";
import PropSlider from './PropSlider.vue';
import HeartPulse from "./icons/HeartPulse.vue";
const playback = usePlaybackStore();

const creditsModal = inject<Ref<string>>('modalText');

const showCurrentSynthCredits = () => {
    if (!creditsModal) throw new Error('creditsModal not injected');
    if (playback.synth?.credits) {
        creditsModal.value = playback.synth.credits;
    }
}

</script>
<template>
    <EdgeHidableWidget id="synthParamsWindow" style="top:50vh">
        <template #icon>
            <HeartPulse />
        </template>
        <h2>synth params</h2>
        <Suspense>
            <template #fallback>
                <Button :on-click="() => { }">Click to start audio engine</Button>
            </template>
            <div>
                <template v-for="param in playback.synthParams">
                    <PropOption v-if="param.type === ParamType.option" :param="param" />
                    <PropSlider v-if="param.type === ParamType.number" :param="param" />
                </template>
            </div>
        </Suspense>
        <Button v-if="playback.synth?.credits" :on-click="showCurrentSynthCredits">Credits</Button>
    </EdgeHidableWidget>

</template>
