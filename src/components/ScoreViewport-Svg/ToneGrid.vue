<script setup lang="ts">
import { useGridsStore } from '../../store/gridsStore';
import { useViewStore } from '../../store/viewStore';

const grids = useGridsStore();
const view = useViewStore();
</script>
<template>
    <!-- draw a line for each horizontal grid line -->
    <template v-for="(linePositionPy, i) in grids.linePositionsPy" :key="i">
        <line class="grid-line" x1="0" :x2="view.viewWidthPx" :y1="linePositionPy" :y2="linePositionPy" />
    </template>
    <!-- draw a label for each grid line -->
    <template v-for="(label, i) in grids.lineLabels" :key="'label-' + i">
        <text v-if="label.y !== null" x="0" :y="label.y" dy="0.3em" text-anchor="start">{{ label.text }}</text>
    </template>
</template>
<style scoped>
.grid-line {
    stroke: #e0e0e0;
    /* stroke: #250909; */
    stroke-width: 1px;
    /* stroke-dasharray: 3px */
}

@media (prefers-color-scheme: dark) {
    .grid-line {
        stroke: #e0e0e031;
    }
}
</style>