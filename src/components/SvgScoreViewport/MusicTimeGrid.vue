<script setup lang="ts">
import { useViewStore } from '../../store/viewStore';
import { onMounted, Ref, ref, watchEffect, computed } from 'vue';
import { usePlaybackStore } from '../../store/playbackStore';

const view = useViewStore();
const linePositionsPx = ref([]) as Ref<number[]>;

onMounted(() => {

    watchEffect(() => {
        linePositionsPx.value = [];
        for (let i = 0; i < view.viewWidthTime + 1; i++) {
            linePositionsPx.value.push(
                view.timeToPx(i - view.timeOffset % 1)
            );
        }
    });

});

</script>
<template>
    <!-- draw a line for each one unit of time -->
    <line class="grid-line" v-for="linePositionPx in linePositionsPx" :x1="linePositionPx" :x2="linePositionPx" y1="0"
        :y2="view.viewHeightPx" />
</template>
<style scoped>
.grid-line {
    stroke: #e0e0e0;
    stroke-width: 1px;
    stroke-dasharray: 3px
}
</style>