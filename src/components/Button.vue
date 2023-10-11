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
        @mouseenter="mouseEnter" 
        @mouseleave="mouseLeave" 
        @click="onClick" 
        :class="{ active, danger, inline }"
        :style="{ backgroundColor: active ? activeColor : '' }"    
    >
        <slot></slot>
    </button>
</template>

<style scoped>
button {
    padding: 0.3em 0.6em;
    border: none;
    cursor: pointer;
    background-color: rgb(241, 241, 241);
    box-shadow: 0 0 0px rgba(0, 0, 0, 1);
    transition: 0.1s ease-in-out;
}

button:hover {
    background-color: rgb(214, 214, 214);
    box-shadow: 0 0 7px rgba(0, 0, 0, 0.466);
    position: relative;
}

button.active {
    background-color: rgb(235, 210, 229);
}

button.active:hover {
    background-color: rgb(179, 161, 174);
}

button.danger:hover {
    background-color: rgb(255, 90, 49);
}

button.inline {
    padding: 0;
    margin: 0;
    background-color: transparent;
    display: inline-block;
    position: relative;
}
</style>
