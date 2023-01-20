<script setup lang="ts">
import { usePlaybackStore } from "../store/playbackStore";
import EdgeHidableWidget from "./EdgeHidableWidget.vue";
import PropSlider from './PropSlider.vue';
const playback = usePlaybackStore();
const params = await playback.getSynthParams();
</script>
<template>
    <EdgeHidableWidget  id="synthParamsWindow" style="top:4rem">
        <h2>synth params</h2>
        <Suspense>
            <div>
                <template v-for="param in params">
                    <PropSlider :param="param" />
                </template>
            </div>
        </Suspense>
    </EdgeHidableWidget>

</template>
