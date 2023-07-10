<script setup lang="ts">
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';

const view = useViewStore();
const tool = useToolStore();

const getRangePx = () => {
    const selectRange = tool.selectRange;
    const ret = {
        x:0,y:0,width:0,height:0
    }
    
    const rangeTime = selectRange.timeEnd - selectRange.time;
    const rangeOctave = selectRange.octaveEnd - selectRange.octave;

    if(rangeTime < 0) {
        ret.x = view.timeToPxWithOffset(selectRange.time + rangeTime);
    } else {
        ret.x = view.timeToPxWithOffset(selectRange.time);
    }
    ret.width = Math.abs(view.timeToPx(rangeTime));
    // remember down is negative on octave axis
    if(rangeOctave < 0) {
        ret.y = view.octaveToPxWithOffset(selectRange.octave);
    } else {
        ret.y = view.octaveToPxWithOffset(selectRange.octave + rangeOctave);
    }
    ret.height = Math.abs(view.octaveToPx(rangeOctave));

    return ret;
}

</script>
<template>
    <rect 
        v-if="tool.selectRange.active" 
        :...="getRangePx()"
    />
</template>
<style scoped>
rect {
    fill: rgba(161, 154, 143, 0.1);
    stroke: rgba(189, 192, 192, 0.5);
    stroke-width: 1;
    stroke-dasharray: 5px;
}
</style>