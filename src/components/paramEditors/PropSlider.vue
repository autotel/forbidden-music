<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { NumberSynthParam } from '../../synth/SynthInterface';

const props = defineProps({
    param: {
        type: Object as () => NumberSynthParam,
        required: true,
    },
});
let mouseDownPos = {
    x: 0, y: 0,
};
let preMapValueOnDragStart = 0;
const preMapValue = ref(0);
const dragging = ref(false);
const valueDraggable = ref();
const ww = 600;
const minMaxRange = props.param.max - props.param.min;

const mouseDrag = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    let range = props.param.max - props.param.min;

    let mouseMovePos = {
        x: e.clientX,
        y: e.clientY,
    };

    let deltaY = mouseDownPos.y - mouseMovePos.y;
    let deltaX = mouseMovePos.x - mouseDownPos.x;

    let valueToAdd = (deltaY + deltaX);

    let preMapNewVal = preMapValueOnDragStart + (valueToAdd / ww);


    if (isNaN(preMapNewVal)) {
        preMapNewVal = props.param.min;
    }
    if (preMapNewVal < 0) {
        preMapNewVal = 0;
    }
    if (preMapNewVal > 1) {
        preMapNewVal = 1;
    }

    preMapValue.value = preMapNewVal;

    if (props.param.curve === 'log') {
        props.param.value = Math.pow(range + 1, preMapNewVal) - 1 + props.param.min;
    } else {
        props.param.value = preMapNewVal * range + props.param.min;
    }

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
    preMapValueOnDragStart = preMapValue.value;
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
    const range = props.param.max - props.param.min;
    preMapValue.value = props.param.value / range;
    const $valueDraggable = valueDraggable.value;
    if (!$valueDraggable) {
        console.error("valueDraggable ref is " + valueDraggable.value);
        return;
    }
    $valueDraggable.addEventListener('mousedown', mouseDown);
    window.addEventListener('mouseup', mouseUp);
    window.addEventListener('mousemove', windowMouseMove);
});
onBeforeUnmount(() => {
    const $valueDraggable = valueDraggable.value;
    if (!$valueDraggable) {
        console.error("valueDraggable ref is " + valueDraggable.value);
        return;
    }
    $valueDraggable.removeEventListener('mousedown', mouseDown);
    window.removeEventListener('mouseup', mouseUp);
    window.removeEventListener('mousemove', windowMouseMove);

});
</script>
<template>
    <div class="number-knob-container" ref="valueDraggable" :class="{ active: dragging }" style="width:100%">

        <template v-if="props.param.max !== undefined && props.param.min !== undefined">
            <div class="prog-container">
                <div class="prog-bar" :class="{ negative: preMapValue < 0 }" :style="{
                    width: (preMapValue >= 0 ? (preMapValue) : (-preMapValue)) * 100 + '%',
                    left: (preMapValue >= 0 ? 0 : (1 - preMapValue)) * 100 + '%',
                }"></div>
            </div>
        </template>
        <span style="{position: absolute; z-index: 2;}">
            {{ props.param.displayName }} &nbsp; {{ param.value?.toFixed(3) }} ({{ preMapValue.toFixed(2) }})
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
    box-sizing: border-box;
}
</style>
