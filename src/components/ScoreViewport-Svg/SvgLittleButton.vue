<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useCommunicationStore } from '../../store/communicationStore';

const props = defineProps<{
    x: number,
    y: number,
    onClick?: () => void,
    tooltip?: string
}>();

const communications = useCommunicationStore();
const body = ref<SVGRectElement>();
const bodyMouseEnterListener = (e: MouseEvent) => {
    if (!props.tooltip) return;
    e.stopImmediatePropagation();
    if (body.value) {
        communications.tooltip(props.tooltip, body.value);
    }
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    if (communications.currentTooltip?.owner !== body.value) return;
    e.stopImmediatePropagation();
    communications.tooltipOff();
}

onMounted(() => {
    if (body.value) {
        body.value.addEventListener('mouseenter', bodyMouseEnterListener);
        body.value.addEventListener('mouseleave', bodyMouseLeaveListener);
    }
});
onBeforeUnmount(() => {
    if (body.value) {
        body.value.removeEventListener('mouseenter', bodyMouseEnterListener);
        body.value.removeEventListener('mouseleave', bodyMouseLeaveListener);
    }
});

</script>
<template>
    <rect ref="body" :x="x" :y="y" rx="6" ry="6" :onClick="onClick" width="20" height="20" stroke="currentColor" />
    <text :x="x + 10" :y="y + 10" v-bind="$attrs" text-anchor="middle" dominant-baseline="middle" fill="currentColor">
        <slot />
    </text>
</template>
<style scoped>
rect {
    fill: rgba(0, 0, 0, 0.041);
    /* stroke: #0005; */
    cursor: pointer;
}

text {
    font-size: 20px;
    /* fill: #0005; */
    pointer-events: none;
}

rect:hover,
text:hover {
    fill: #ffffff86;
}

@media (prefers-color-scheme: dark) {

    rect:hover,
    text:hover {
        fill: #00000086;
    }
}
</style>