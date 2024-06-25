<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { OptionSynthParam } from '../../../synth/interfaces/SynthParam';
import Tooltip from '../../Tooltip.vue';
const triangleLeft = '◀';
const triangleRight = '▶';
const triangleDown = '▼';

const props = defineProps<{
    param: OptionSynthParam
}>();
const emit = defineEmits(['update']);
const readout = computed(() => {
    if (props.param.displayName) {
        return props.param.displayName + ": " + currentValueName.value;
    }
    return currentValueName.value;
});

const currentValueName = ref("--");
const open = ref(false);
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

onMounted(() => {
    const selectedOption = props.param.value;
    currentValueName.value = props.param.options[selectedOption]?.displayName;
});

watch(() => props.param.value, (newValue) => {
    currentValueName.value = props.param.options[newValue]?.displayName;
});
const exitListener = () => {
    if (open.value) {
        open.value = false;
        document.removeEventListener('mousedown', exitListener);
        document.removeEventListener('keydown', exitListener);
    }
}
const openClickListener = (e: MouseEvent) => {
    if (!open.value) {
        document.addEventListener('mousedown', exitListener);
        document.addEventListener('keydown', exitListener);
        open.value = true;
    }
}
const selectOption = (i: number) => {
    props.param.value = i;
    currentValueName.value = props.param.options[i].displayName;
    open.value = false;
    emit('update');
}

</script>
<template>
    <div class="opener" @click="openClickListener">
        <Tooltip :tooltip="readout">
            <div class="sw-button">
                {{ triangleDown }}
            </div>
        </Tooltip>
    </div>
    <div class="options-container" v-if="open">
        <span class="option" v-for="(option, i) in param.options" @mousedown="selectOption(i)"
            :class="{ selected: param.value === i }">
            {{ option.displayName }}
        </span>
    </div>

</template>
<style>
.opener {
    /* position: relative; */
    overflow: visible;
    cursor: pointer;
}

.options-container {
    position: absolute;
    display: flex;
    flex-direction: column;
    background-color: #d3cfcf;
    color: black;
    border: solid 1px;
    border-radius: 0.5em;
    overflow: hidden;
    cursor: pointer;
    z-index: 2;
    top:0;
    max-height: 100%;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #7c7c7c transparent;
}

.option:hover {
    background-color: #b3adad;
}

.option {
    padding: 0.2em;
}

.selected {
    background-color: rgb(238, 175, 92);
    color: black;
}
</style>
