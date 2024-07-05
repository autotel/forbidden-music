<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Tooltip from '../../../components/Tooltip.vue';
import { abbreviate } from '../../../functions/abbreviate';
import { NumberSynthParam } from '../../../synth/types/SynthParam';
const props = defineProps<{
    value: number,
    max: number,
    min: number,
    size: number,
}>();

const emit = defineEmits<{ (e: 'update', value: number): void }>();

let mouseDownPos = {
    x: 0, y: 0,
};

const paramValueToLocalValue = () => {
    localValue.value = (props.value - props.min) / (props.max - props.min);
}
const localValueToParamValue = () => {
    emit('update', (localValue.value * (props.max - props.min) + props.min));
}
const canvas = ref<HTMLCanvasElement | null>(null);
const localValue = ref(0);

let valueOnDragStart = 0;
const dragging = ref(false);
const ww = 600;

watch(() => props.value, () => {
    paramValueToLocalValue();
});

const mouseWheeled = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    mouseDragDelta({ x: e.deltaX / 5, y: e.deltaY / 5 });
}

const mouseDrag = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const delta = {
        x: e.movementX,
        y: e.movementY,
    }
    mouseDragDelta(delta);
}

const mouseDragDelta = ({ x, y }: { x: number, y: number }) => {
    let val = localValue.value - (y / ww);

    if (val > 1) {
        val = 1;
    }
    if (val < 0) {
        val = 0;
    }
    localValue.value = val;
    localValueToParamValue();
}

const windowMouseMove = (e: MouseEvent) => {
    if (!dragging.value) return;
    mouseDrag(e);
}
const mouseDown = async (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
        await canvas.value?.requestPointerLock();
        // better practice would be to make this on listener document.addEventListener("pointerlockchange", lockChangeAlert, false);
        if (document.pointerLockElement === canvas.value) {
            console.log("The pointer lock status is now locked");
            // window.addEventListener("mousemove", lockedPointerMoved, false);
        }
    }
    catch (e) {
        console.warn('pointer lock did not work');
    }

    window.addEventListener('mousemove', windowMouseMove);
    window.addEventListener('mouseup', mouseUp);
    dragging.value = true;
    mouseDownPos = {
        x: e.clientX,
        y: e.clientY,
    };
    valueOnDragStart = localValue.value;
}
const mouseUp = (e: MouseEvent) => {
    e.stopPropagation();
    dragging.value = false;
    document.exitPointerLock();
    window.removeEventListener('mouseup', mouseUp);
    window.removeEventListener('mousemove', windowMouseMove);
}
onMounted(() => {
    paramValueToLocalValue();
});
onUnmounted(() => {
    window.removeEventListener('mouseup', mouseUp);
    window.removeEventListener('mousemove', windowMouseMove);
});
const addWheelListeners = () => {
    window.addEventListener('wheel', mouseWheeled);
}
const removeWheelListeners = () => {
    window.removeEventListener('wheel', mouseWheeled);
}
const hsl = computed (() => {
    return `hsl(${localValue.value * 190 + 10}, ${Math.abs(localValue.value * 100 - 50)}%, 50%)`;
});
</script>
<template>
    <div class="prevent-select knob-layout" @mousedown="mouseDown" @mouseenter="addWheelListeners"
        @mouseleave="removeWheelListeners" :style="{ width: size + 'px', height: size + 'px' }">
        <canvas class="knob" ref="canvas" :style="`background-color:${hsl}`">
        </canvas>
        <div class="val" :class="{dragging}">
            {{ value.toPrecision(4) }}
        </div>

    </div>
</template>
<style scoped>
.knob-layout {
    display: block;
    width: 1em;
    height: 1em;
    position: relative;
}

.knob {
    width: 100%;
    height: 100%;
    cursor: ns-resize;
    background-color: hsl(204, 100%, 50%);
}
.dragging.val, .knob-layout:hover>.val{
    display: block;
}
.val {
    display: none;
    position: absolute;
    z-index: 1;
    top: 10px;
    left: 10px;
    color: white;
    padding: 0.1em;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 0.2em;
    pointer-events: none;
}
</style>
