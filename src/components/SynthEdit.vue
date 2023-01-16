<script setup lang="ts">
import { usePlaybackStore } from "../store/playbackStore";
import PropSlider from './PropSlider.vue';
const playback = usePlaybackStore();
const params = await playback.getSynthParams();
</script>
<template>
    <template v-for="param in params">
        <PropSlider 
            :object="param.valueContainer" 
            :propName="param.valueName" 
            :displayName="param.displayName?param.displayName:param.valueName" 
            :max="1"
            :min="-1"
        />
    </template>
</template>

    
