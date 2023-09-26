<script setup lang="ts">
import { useSlots } from 'vue';
import { useToolStore } from '../store/toolStore';
const slots = useSlots()
const tool = useToolStore();

const props = defineProps<{
    tooltip?: string
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
    <span @mouseenter="mouseEnter" @mouseleave="mouseLeave">
        <slot></slot>
    </span>
</template>

