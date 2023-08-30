<script setup lang="ts">
import { ref } from 'vue';
import { useToolStore } from '../../store/toolStore';

defineProps<{
    x: number,
    y: number,
}>();

const tool = useToolStore();
const body = ref<SVGRectElement>();
const bodyMouseEnterListener = (e: MouseEvent) => {
    e.stopImmediatePropagation();
    if (body.value) {
        tool.tooltip = 'double click to change count';
        tool.tooltipOwner = noteBody.value;
    }
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    e.stopImmediatePropagation();
    tool.tooltip = '';
    tool.tooltipOwner = null;
}
</script>
<template>
    <rect 
        ref="body"
        :x="x"
        :y="y"
        rx="6"
        ry="6"
        
        width="20" 
        height="20"     
    />
    <text 
    
        :x="x + 10"
        :y="y + 10"
        v-bind="$attrs" 
        text-anchor="middle" 
        dominant-baseline="middle"
        
    >
            <slot />
    </text>
</template>
<style scoped>
    rect {
        fill: rgba(0, 0, 0, 0);
        stroke: #0005;
    }
    text {
        font-size: 20px;
        fill: #0005;
    }
</style>