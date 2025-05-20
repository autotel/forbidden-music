<script setup lang="ts">
import { useSlots } from 'vue';
import { useCommunicationStore } from '../store/communicationStore';
const slots = useSlots()
const communications = useCommunicationStore();

const props = defineProps<{
    onClick?: ((payload: MouseEvent) => void)
    active?: boolean | undefined
    danger?: boolean | undefined
    tooltip?: string
    activeColor?: string
}>()


const mouseEnter = (e: MouseEvent) => {
    let tooltip = props.tooltip || slots.tooltip?.toString();
    if (!tooltip) return;
    communications.tooltip(tooltip, e.target as HTMLElement);
}

const mouseLeave = (e: MouseEvent) => {
    communications.tooltipOff();
}


</script>

<template>
    <button @mouseenter="mouseEnter" @mouseleave="mouseLeave" @click="onClick" :class="{ active, danger }"
        :style="{ backgroundColor: active ? activeColor : '' }">
        <slot></slot>
    </button>
</template>

<style scoped>
button {
    border-radius: 50%;
    height: 1.4em;
    width: 1.4em;
    background-color: rgb(212, 212, 212);
    padding: 0;
    border: solid 1px;
    cursor: pointer;
    display: inline-block;
    margin-top: -0.1em;
    margin-bottom: -0.1em;
    overflow: hidden;
}

button:hover {
    background-color: rgba(255, 255, 255, 0.425);

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

@media (prefers-color-scheme:dark) {}
</style>
