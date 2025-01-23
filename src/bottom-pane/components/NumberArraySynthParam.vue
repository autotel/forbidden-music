<script setup lang="ts">
import { computed } from 'vue';
import Tooltip from '@/components/Tooltip.vue';
import { abbreviate } from '@/functions/abbreviate';
import { ArraySynthParam } from '@/synth/types/SynthParam';
import NumberArraySynthParamSlider from './NumberArraySynthParamSlider.vue';
const props = defineProps<{
    param: ArraySynthParam
    cols?: number
}>();
let cols = props.cols || 4;
const colWidth = 20;
const emit = defineEmits(['update']);
const update = (v: number, i: number) => {
    props.param.value[i] = v;
    emit('update');
}
const abbreviatedName = computed(() => {
    if (!props.param.displayName) return '';
    return abbreviate(props.param.displayName, 10);
});

const tooltip = computed(() => {
    if(props.param.tooltip) return props.param.tooltip;
    return props.param.displayName;
});
</script>
<template>
    <Tooltip> <!-- :tooltip="tooltip"-->
        <div class="layout">
            <div class="slider-array-container" :style="{width: cols * colWidth + 'px'}">
                <NumberArraySynthParamSlider 
                    v-for="(v, i) in props.param.value"
                    :size="colWidth"
                    :key="i" 
                    :value="v"
                    :max="props.param.max" 
                    :min="props.param.min" 
                    :index="i"
                    @update="(v:number) => update(v,i)"
                />
            </div>
            <p>{{abbreviatedName}}</p>
        </div>
    </Tooltip>
</template>
<style scoped>
.layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 5px;
}
.slider-array-container {
    
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    
    margin: 15px;
}
</style>
