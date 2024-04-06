<script setup lang="ts">
import Button from "../../components/Button.vue";
import { SynthChannel, useSynthStore } from "../../store/synthStore";
import { SynthInterface } from "../../synth/super/Synth";
import { EffectInstance } from "../../synth/super/SynthInterface";
import ParamsSliderList from "./ParamsSliderList.vue";
import PropOption from "../../components/paramEditors/PropOption.vue";
import { computed, inject, ref, watch } from "vue";
import Tooltip from "../../components/Tooltip.vue";
import onePerRuntimeStore from "../../store/onePerRuntimeStore";
const props = defineProps<{
    activeLayerChan: SynthChannel | null,
    showCredits: (ofSynth: SynthInterface | EffectInstance) => void
}>()
const synth = useSynthStore();
const isSynthReady = ref(false);
const isSupposedlyLoading = ref(false);
const onePerRuntime = onePerRuntimeStore();
const myIntervalKey = 'synth selector interval';
// watchers are not detecting the changes, so ...  
if(!onePerRuntime.keyExists(myIntervalKey)){
    setInterval(() => {
        isSynthReady.value = false;
        if (
            props.activeLayerChan &&
            props.activeLayerChan.synth.isReady
        ) {
            isSynthReady.value = true;
        }
        if (isSupposedlyLoading.value) {
            dots.value = dots.value + ".";
            if (dots.value.length > 3) {
                dots.value = ".";
            }
        }
    }, 800);
    onePerRuntime.add(myIntervalKey, true);
}

watch(() => props.activeLayerChan?.synth, () => {
    isSynthReady.value = false;
    isSupposedlyLoading.value = false;
    dots.value = "...";
})
const dots = ref('...');

</script>
<template>
    <template v-if="activeLayerChan">
        <PropOption :param="synth.synthSelector(activeLayerChan)" />
        <template v-if="isSynthReady">
            <ParamsSliderList :synthParams="activeLayerChan.params" />
            <Button class="padded" v-if="'credits' in activeLayerChan.synth"
                :on-click="() => activeLayerChan ? showCredits(activeLayerChan.synth) : null">
                Credits
            </Button>
            <p>Ready</p>
        </template>
        <template v-else-if="isSupposedlyLoading">
            <Button :on-click="() => { isSupposedlyLoading = false; }">
                Loading {{ dots }}
            </Button>
        </template>

        <template v-else>
            <Button tooltip="Click to load right away" :on-click="() => { activeLayerChan?.synth.enable(); isSupposedlyLoading = true; }">
                Waiting to load
            </Button>
        </template>
    </template>
</template>