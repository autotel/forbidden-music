<script setup lang="ts">
import { useSlots } from 'vue';
import { useCommunicationStore } from '../store/communicationStore';
const slots = useSlots()
const communications = useCommunicationStore();

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
    communications.tooltip(tooltip, e.target as HTMLElement);
    
}

const mouseLeave = () => {
    communications.tooltipOff();
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
