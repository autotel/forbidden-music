<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { SynthParam, OptionSynthParam } from '../toneSynths/Synthinterface';

const props = defineProps({
    param: {
        type: Object as () => OptionSynthParam,
        required: true,
    },
});
let mouseDownPos = {
    x: 0, y: 0,
};
let currentValueOnDragStart = 0;
console.log("creating option for", props.param.displayName);
const currentValueName = ref("--");
const dragging = ref(false);
const valueDraggable = ref();
const ww = 600;

const mouseDown = (e: MouseEvent) => {

    e.stopPropagation();
    e.preventDefault();
    
    const paramOptions = props.param.options;
    const currentOption = props.param.getter();
    console.log("current value is", currentOption);
    let nextOption = currentOption + 1;
    if (nextOption >= paramOptions.length) nextOption = 0;
    props.param.setter(nextOption);
    currentValueName.value = paramOptions[nextOption].displayName;
    console.log("next value is", nextOption);
}
onMounted(() => {
    currentValueName.value = props.param.options[props.param.getter()].displayName;
    const $valueDraggable = valueDraggable.value;
    if (!$valueDraggable) throw new Error("valueDraggable ref is " + valueDraggable.value);
    $valueDraggable.addEventListener('mousedown', mouseDown);
});
onUnmounted(() => {
    const $valueDraggable = valueDraggable.value;
    if (!$valueDraggable) throw new Error("valueDraggable ref is " + valueDraggable.value);
    $valueDraggable.removeEventListener('mousedown', mouseDown);

});
</script>
<template>
    <div class="option-container" ref="valueDraggable" :class="{ active: dragging }" style="width:300px">
        {{ props.param.displayName }}
        <span style="{position: absolute; z-index: 2;}">
            {{ currentValueName }}
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

.option-container {
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
