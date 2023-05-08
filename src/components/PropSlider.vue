<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue';
import { SynthParam, NumberSynthParam } from '../toneSynths/SynthInterface';

const props = defineProps({
    param: {
        type: Object as () => NumberSynthParam,
        required: true,
    },
});
let mouseDownPos = {
    x: 0, y: 0,
};
let currentValueOnDragStart = 0;
console.log("creating slider for", props.param.displayName);
const currentValue = ref(0);
const dragging = ref(false);
const valueDraggable = ref();
const ww = 600;

const minMaxRange = props.param.max - props.param.min;

const mouseDrag = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();


    let mouseMovePos = {
        x: e.clientX,
        y: e.clientY,
    };

    let deltaY = mouseDownPos.y - mouseMovePos.y;
    let deltaX = mouseMovePos.x - mouseDownPos.x;

    let valueToAdd = (deltaY + deltaX) * minMaxRange;

    let val = currentValueOnDragStart + (valueToAdd / ww);

    if (val > props.param.max) {
        val = props.param.max;
    }
    if (val < props.param.min) {
        val = props.param.min;
    }
    if (isNaN(val)) {
        val = props.param.min;
    }
    currentValue.value = val;
    props.param.setter(val);
}
const windowMouseMove = (e: MouseEvent) => {
    if (!dragging.value) return;
    mouseDrag(e);
}
const mouseDown = (e: MouseEvent) => {
    mouseDownPos = {
        x: e.clientX,
        y: e.clientY,
    };
    currentValueOnDragStart = currentValue.value;
    e.stopPropagation();
    e.preventDefault();
    dragging.value = true;
}
const mouseUp = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragging.value = false;
}
onMounted(() => {
    currentValue.value = props.param.getter();
    const $valueDraggable = valueDraggable.value;
    if (!$valueDraggable) throw new Error("valueDraggable ref is " + valueDraggable.value);
    $valueDraggable.addEventListener('mousedown', mouseDown);
    window.addEventListener('mouseup', mouseUp);
    window.addEventListener('mousemove', windowMouseMove);
});
onBeforeUnmount(() => {
    const $valueDraggable = valueDraggable.value;
    if (!$valueDraggable) throw new Error("valueDraggable ref is " + valueDraggable.value);
    $valueDraggable.removeEventListener('mousedown', mouseDown);
    window.removeEventListener('mouseup', mouseUp);
    window.removeEventListener('mousemove', windowMouseMove);

});
</script>
<template>
    <div class="number-knob-container" ref="valueDraggable" :class="{ active: dragging }" style="width:300px">
        {{ props.param.displayName }}
        <template v-if="props.param.max !== undefined && props.param.min !== undefined">
            <div class="prog-container">
                <div class="prog-bar" :class="{ negative: currentValue < 0 }" :style="{
                    width: (currentValue > 0 ? (currentValue / props.param.max) : (currentValue / props.param.min)) * 100 + '%',
                    left: (currentValue > 0 ? 0 : (1 - currentValue / props.param.min)) * 100 + '%',
                }"></div>
            </div>
        </template>
        <span style="{position: absolute; z-index: 2;}">
            {{ currentValue?.toFixed(2) }}
        </span>
    </div>

</template>
<style>
.prog-bar {
    position: absolute;
    height: 100%;
    background-color: rgba(0, 94, 117, 0.466);
    top: 0;
}

.prog-bar.negative {
    background-color: rgba(117, 0, 0, 0.466);
}

.prog-container {
    position: absolute;
    height: 100%;
    width: 100%;
    top: 0;
}

.active {
    background-color: rgb(7, 77, 99);
}

.number-knob-container {
    user-select: none;
    display: inline-flex;
    position: relative;
    border: solid 1px rgb(166, 172, 172);
    background-color: rgb(1, 22, 15);
    color: white;
    font-family: monospace;
    height: 2em;
    align-items: center;
    text-align: center;
    justify-content: center;
}
</style>
