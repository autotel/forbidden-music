<script setup lang="ts">
import { useSlots, watch } from 'vue';
import { useCommunicationStore } from '../store/communicationStore';
const slots = useSlots()
const communications = useCommunicationStore();

const props = defineProps<{
    tooltip?: string,
    forceHide?: boolean,
}>()


const mouseEnter = (e: MouseEvent) => {
    let tooltip = props.tooltip || slots.tooltip?.toString();
    if (!tooltip) return;
    communications.tooltip(tooltip, e.target as HTMLElement);
}

const mouseLeave = (e: MouseEvent) => {
    communications.tooltipOff();
}

watch(() => props.forceHide, (newVal) => {
    if (newVal) {
        communications.tooltipOff();
    }
})

</script>

<template>
    <span @mouseenter="mouseEnter" @mouseleave="mouseLeave">
        <slot></slot>
    </span>
</template>
