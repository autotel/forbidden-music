<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Tooltip from '../../../components/Tooltip.vue';
import { abbreviate } from '../../../functions/abbreviate';
import { NumberSynthParam } from '../../../synth/interfaces/SynthParam';
const props = defineProps<{
    param: NumberSynthParam
}>();


const emit = defineEmits(['update']);

let mouseDownPos = {
    x: 0, y: 0,
};
const knobAngle = (angle: number) => {
    angle *= 270;
    angle -= 45;
    return `transform:rotate(${angle}deg)`;
}
const abbreviatedName = computed(() => {
    if (!props.param.displayName) return '';
    // return props.param.displayName;
    return abbreviate(props.param.displayName, 10);
});
const paramValueToLocalValue = () => {
    localValue.value = (props.param.value - props.param.min) / (props.param.max - props.param.min);
}
const localValueToParamValue = () => {
    props.param.value = (localValue.value * (props.param.max - props.param.min) + props.param.min);
}
const canvas = ref<HTMLCanvasElement | null>(null);
const localValue = ref(0);

let valueOnDragStart = 0;
const dragging = ref(false);
const ww = 600;

watch(() => props.param.value, () => {
    paramValueToLocalValue();
    emit('update');
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
const tooltip = computed(() => {
    if(props.param.tooltip) return props.param.tooltip;
    return props.param.displayName;
});
</script>
<template>
    <Tooltip :tooltip="tooltip" :force-hide="dragging">
        <div class="prevent-select knob-layout" @mousedown="mouseDown" @mouseenter="addWheelListeners"
            @mouseleave="removeWheelListeners">

            <div class="knob">
                <div :style="knobAngle(localValue)">
                    <span style="font-size:2em">-</span>
                    <canvas ref="canvas" width="0" height="0"></canvas>
                </div>
            </div>
            <small>{{ abbreviatedName }}</small>
            <small>{{ props.param.displayValue || props.param.value.toFixed(2) }}</small>

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
