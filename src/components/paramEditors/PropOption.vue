<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { OptionSynthParam } from '../../synth/SynthInterface';

const triangleLeft = '◀';
const triangleRight = '▶';

const props = defineProps({
    param: {
        type: Object as () => OptionSynthParam,
        required: true,
    },
});

const currentValueName = ref("--");
const dragging = ref(false);
const minusButton = ref();
const plusButton = ref();

enum UpOrDown {
    Up,
    Down,
}

const applyValueDelta = (ud: UpOrDown) => {
    const paramOptions = props.param.options;
    const currentOption = props.param.value;
    const delta = ud === UpOrDown.Up ? 1 : -1;
    let nextOption = currentOption + delta;
    if (nextOption < 0) {
        nextOption = paramOptions.length - 1;
    }
    if (nextOption >= paramOptions.length) {
        nextOption = 0;
    }

    props.param.value = nextOption;
    currentValueName.value = paramOptions[nextOption].displayName;
}

const minusButtonClicked = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    e.stopImmediatePropagation();
    applyValueDelta(UpOrDown.Down);
}

const plusButtonClicked = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    e.stopImmediatePropagation();
    applyValueDelta(UpOrDown.Up);
}

const mouseDown = (e: MouseEvent) => {

    e.stopPropagation();
    e.preventDefault();

    applyValueDelta(UpOrDown.Up);
}

onMounted(() => {
    const selectedOption = props.param.value;
    currentValueName.value = props.param.options[selectedOption]?.displayName;
});

watch(() => props.param.value, (newValue) => {
    currentValueName.value = props.param.options[newValue]?.displayName;
});


</script>
<template>
    <div class="option-container" ref="valueDraggable" :class="{ active: dragging }">
        <div class="sw-button" ref="minusButton" @click="minusButtonClicked">
            {{ triangleLeft }}
        </div>
        <span style="{position: absolute; z-index: 2;}">
            {{ props.param.displayName }}: {{ currentValueName }}
        </span>
        <div class="sw-button" ref="plusButton" @click="plusButtonClicked">
            {{ triangleRight }}
        </div>
    </div>

</template>
<style>

.sw-button {
    padding: 0 1em;
    cursor: pointer;
}

.sw-button:hover {
    background-color: rgba(7, 77, 99,0.5);
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

.option-container {
    user-select: none;
    display: inline-flex;
    position: relative;
    width:100%;
    box-sizing: border-box;
    border: solid 1px rgb(166, 172, 172);
    background-color: rgb(1, 22, 15);
    color: white;
    font-family: monospace;
    height: 2em;
    align-items: center;
    text-align: center;
    justify-content: space-between;
}
</style>
