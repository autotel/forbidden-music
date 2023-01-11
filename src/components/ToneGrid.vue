<script setup lang="ts">
import { useViewStore } from '../store/viewStore';
import { onMounted, Ref, ref, watchEffect, computed } from 'vue';
import { usePlaybackStore } from '../store/playbackStore';

const view = useViewStore();
const linePositionsPx = ref([]) as Ref<number[]>;

onMounted(() => {

    watchEffect(() => {
        linePositionsPx.value = [];
        for (let i = 0; i < view.viewHeightOctaves + 1; i++) {
            linePositionsPx.value.push(
                view.octaveToPxWithOffset(i)
            );
        }
    });

});

</script>
<template>
    <!-- draw a line for each one unit of time -->
    <line class="grid-line" v-for="linePositionPx in linePositionsPx" x1="0" :x2="view.viewWidthPx" :y1="linePositionPx"
        :y2="linePositionPx" />
</template>
<style>
.grid-line {
    stroke: #e0e0e0;
    stroke-width: 1px;
    stroke-dasharray: 3px
}
</style>