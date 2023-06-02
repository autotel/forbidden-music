<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({
    modelValue: {
        type: Number,
        required: true,
    },
    max: {
        type: Number,
        required: false,
        default: 1,
    },
    min: {
        type: Number,
        required: false,
        default: -1,
    },
    vertical: {
        type: Boolean,
        required: false,
        default: false,
    },
});
let mouseDownPos = {
    x: 0, y: 0,
};
let modelValueOnDragStart = 0;
const dragging = ref(false);
const emit = defineEmits(['update:modelValue']);
const ww = 600;
const mouseDrag = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    let mouseMovePos = {
        x: e.clientX,
        y: e.clientY,
    };

    let deltaY = mouseDownPos.y - mouseMovePos.y;
    let val = modelValueOnDragStart + (deltaY / ww);

    if (val > props.max) {
        val = props.max;
    }
    if (val < props.min) {
        val = props.min;
    }
    emit('update:modelValue', val);
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
    modelValueOnDragStart = props.modelValue;
    e.stopPropagation();
    e.preventDefault();
    dragging.value = true;

    window.addEventListener('mouseup', mouseUp);
    window.addEventListener('mousemove', windowMouseMove);
}
const mouseUp = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragging.value = false;

    window.removeEventListener('mouseup', mouseUp);
    window.removeEventListener('mousemove', windowMouseMove);
}
</script>
<template>
    <div class="number-knob-container" @mousedown="mouseDown" :class="{ active: dragging, vertical }">
        <div>
            <template v-if="props.max !== undefined && props.min !== undefined">
                <div class="prog-container">
                    <div class="prog-bar" :class="{ negative: modelValue < 0 }" :style="{
                        width: (modelValue > 0 ? (modelValue / props.max) : (modelValue / props.min)) * 100 + '%',
                        left: (modelValue > 0 ? 0 : (1 - modelValue / props.min)) * 100 + '%',
                    }"></div>
                </div>
            </template>
            <span style="{position: absolute; z-index: 2;}">
                {{ modelValue.toFixed(2) }}
            </span>
        </div>
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
    border: solid 1px rgb(166, 172, 172);
    background-color: rgb(1, 22, 15);
    color: white;
    font-family: monospace;
    width: 2em;
    height: 3em;
}
.number-knob-container>* {
    display: inline-flex;
    position: relative;
    align-items: center;
    text-align: center;
    justify-content: center;

}
.number-knob-container.vertical>* {
    transform-origin: center;
    transform: rotate(90deg);
    width: 3em;
    height: 2em;
}
</style>
