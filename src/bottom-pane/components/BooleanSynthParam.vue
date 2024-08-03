<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Tooltip from '@/components/Tooltip.vue';
import { abbreviate } from '@/functions/abbreviate';
import { BooleanSynthParam } from '@/synth/types/SynthParam';
import Switch from '@/components/icons/Switch.vue';
const props = defineProps<{
    param: BooleanSynthParam
}>();

const emit = defineEmits(['update']);

const abbreviatedName = computed(() => {
    if (!props.param.displayName) return '';
    return abbreviate(props.param.displayName, 10);
});

const canvas = ref<HTMLCanvasElement | null>(null);

const mouseDown = async (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    props.param.value = !props.param.value;
    emit('update');
}
const tooltip = computed(() => {
    if(props.param.tooltip) return props.param.tooltip;
    return props.param.displayName;
});
</script>
<template>
    <Tooltip :tooltip="tooltip">
        <div class="prevent-select knob-layout" @mousedown="mouseDown">

            <Switch :on="param.value" 
            style="height: 2em; width: 2em; top: 0.2em; position: relative;" />
            <small>{{ abbreviatedName }}</small>

        </div>
    </Tooltip>
</template>
<style scoped>
.knob-layout {
    width: 4em;
    height: fit-content;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.2em;
    overflow: hidden;
}

.knob {
    display: inline-block;
    border: solid 1px;
    border-radius: 50%;
    width: 1.9em;
    height: 1.9em;
    fill: currentcolor;
    cursor: grab;
}

.knob>* {
    transform-origin: center;
    opacity: 0.5;
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
}

.knob:hover {
    box-shadow: 0.3em 0.3em 0.6em rgba(0, 0, 0, 0.356);
}

small {
    white-space: nowrap;
}

canvas {
    position: absolute;
}
</style>
