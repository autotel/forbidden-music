<script setup lang="ts">
import { reactive, watch } from "vue";
import { usePlaybackStore } from "../store/playbackStore";
import { ParamType } from "../toneSynths/Synthinterface";
import EdgeHidableWidget from "./EdgeHidableWidget.vue";
import PropOption from "./PropOption.vue";
import PropSlider from './PropSlider.vue';
const playback = usePlaybackStore();
</script>
<template>
    <EdgeHidableWidget id="synthParamsWindow" style="top:50vh">
        <h2>synth params</h2>
        <Suspense>
            <div>
                <template v-for="param in playback.synthParams">
                    <PropOption v-if="param.type === ParamType.option" :param="param" />
                    <PropSlider v-if="param.type === ParamType.number" :param="param" />
                </template>
            </div>
        </Suspense>
    </EdgeHidableWidget>

</template>
