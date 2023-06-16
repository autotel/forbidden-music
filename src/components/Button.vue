<script setup lang="ts">
import { clear } from 'console';
import { ref } from 'vue';
import Tooltip from './Tooltip.vue';


const props = defineProps<{
    onClick: ((payload: MouseEvent) => void)
    active?: boolean | undefined
    danger?: boolean | undefined
    tooltip?: string
}>()

const showTooltip = ref(false);
const showTimeout = ref<false | NodeJS.Timeout>(false);

const mouseEnter = (e: MouseEvent) => {
    if (props.tooltip) {
        if (showTimeout.value) return;
        showTimeout.value = setTimeout(() => {
            showTooltip.value = true;
        }, 500);
    }
}

const mouseLeave = (e: MouseEvent) => {
    if (showTimeout.value) clearTimeout(showTimeout.value);
    showTimeout.value = false;
    showTooltip.value = false;
}

</script>

<template>
    <button @mouseenter="mouseEnter" @mouseleave="mouseLeave" @click="onClick" :class="{active, danger}">
        <slot></slot>
        <Tooltip v-if="showTooltip">{{ tooltip }}</Tooltip>

    </button>
</template>

<style scoped>
button {
    margin: 1px 1px;
    padding: 0.3em 0.6em;
    border: none;
    cursor: pointer;
    background-color: rgb(241, 241, 241);
}

button:hover {
    background-color: rgb(214, 214, 214);

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
</style>
