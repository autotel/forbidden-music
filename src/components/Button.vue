<script setup lang="ts">
import { ref, useSlots } from 'vue';
import { useToolStore } from '../store/toolStore';
const slots = useSlots()
const tool = useToolStore();

const props = defineProps<{
    onClick: ((payload: MouseEvent) => void)
    active?: boolean | undefined
    danger?: boolean | undefined
    tooltip?: string
    inline?: boolean
    activeColor?: string
}>()


const mouseEnter = (e: MouseEvent) => {
    let tooltip = props.tooltip || slots.tooltip?.toString();
    if (!tooltip) return;
    tool.tooltip = tooltip;
    tool.tooltipOwner = e.target as HTMLElement;
}

const mouseLeave = (e: MouseEvent) => {
    tool.tooltip = '';
    tool.tooltipOwner = null;
}


</script>

<template>
    <button
        class="button"
        @mouseenter="mouseEnter" 
        @mouseleave="mouseLeave" 
        @click="onClick" 
        :class="{ active, danger, inline }"
        :style="{ backgroundColor: active ? activeColor : '' }"
        v-bind="$attrs"
    >
        <slot></slot>
    </button>
</template>
