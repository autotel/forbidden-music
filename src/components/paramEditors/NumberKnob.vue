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
    dragging.value = true;

    window.addEventListener('mouseup', mouseUp);
    window.addEventListener('mousemove', windowMouseMove);
}
const mouseUp = (e: MouseEvent) => {
    e.stopPropagation();
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
                        width: (modelValue >= 0 ? (modelValue / props.max) : (modelValue / props.min)) * 100 + '%',
                        left: (modelValue >= 0 ? 0 : (1 - modelValue / props.min)) * 100 + '%',
                    }"></div>
                </div>
            </template>
            <span class="text" style="position: absolute; display:block; z-index: 2; height:100%">
                {{ modelValue.toFixed(2) }}
            </span>
            <svg
                v-if="dragging"
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 512 512"
                class="knob"
                :style="{
                    transform: `rotate(${modelValue * 270}deg)`,
                }"
            >
                <!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. -->
                <path
                    d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"
                />
            </svg>
        </div>
    </div>
</template>
<style>
.knob {
    fill: currentcolor;
    transform-origin: center;
    width: 1.3em;
    position: absolute;
    opacity: 0.5;
}
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
    transform: rotate(-90deg);
    width: 3em;
    height: 2em;
}
.number-knob-container.vertical .text {
    transform-origin: center;
    transform: rotate(180deg);
}
</style>
