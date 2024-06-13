<script setup lang="ts">
import Button from "../../components/Button.vue";
import { SynthChannel, useSynthStore } from "../../store/synthStore";
import { SynthBase } from "../../synth/super/Synth";
import ParamsSliderList from "./ParamsSliderList.vue";
import PropOptionButtons from "../../components/paramEditors/PropOptionButtons.vue";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import onePerRuntimeStore from "../../store/onePerRuntimeStore";
import { AudioEffect } from "../../synth/interfaces/AudioModule";
const props = defineProps<{
    activeLayerChan: SynthChannel | null,
    showCredits: (ofSynth: SynthBase | AudioEffect) => void
}>()

const synth = useSynthStore();
const receivesNotesReady = ref(false);
const isSupposedlyLoading = ref(false);

let myInterval: number | NodeJS.Timer | false = false;
const checkFn = () => {
    receivesNotesReady.value = false;
    if (
        props.activeLayerChan &&
        props.activeLayerChan.synth.isReady
    ) {
        receivesNotesReady.value = true;
        return true;
    }
    if (isSupposedlyLoading.value) {
        dots.value = dots.value + ".";
        if (dots.value.length > 3) {
            dots.value = ".";
        }
    }
    console.log("checkfn")
}
onMounted(() => {
    if (myInterval) {
        clearInterval(myInterval);
        myInterval = false;
    }
    if(!checkFn()) {
        myInterval = setInterval(checkFn, 800);
    }
});
onBeforeUnmount(() => {
    if (myInterval) {
        clearInterval(myInterval);
    }
});

watch(() => props.activeLayerChan?.synth, () => {
    receivesNotesReady.value = false;
    isSupposedlyLoading.value = false;
    dots.value = "...";
})
const dots = ref('...');

</script>
<template>
    <template v-if="activeLayerChan">
        <PropOptionButtons :param="synth.synthSelector(activeLayerChan)" />

        <template v-if="isSupposedlyLoading && !receivesNotesReady">
            <Button :on-click="() => { isSupposedlyLoading = false; }">
                Loading {{ dots }}
            </Button>
        </template>

        <template v-if="isSupposedlyLoading || receivesNotesReady">
            <ParamsSliderList :synthParams="activeLayerChan.params" />
            <Button class="padded" v-if="'credits' in activeLayerChan.synth"
                :on-click="() => activeLayerChan ? showCredits(activeLayerChan.synth) : null">
                Credits
            </Button>
            <p>Ready</p>
        </template>

        <template v-else>
            <Button tooltip="Click to load right away"
                :on-click="() => { activeLayerChan?.synth.enable(); isSupposedlyLoading = true; }">
                Waiting to load
            </Button>
        </template>
    </template>
</template>