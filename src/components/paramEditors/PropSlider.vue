<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Tool } from '../../dataTypes/Tool';
import { useAutomationLaneStore } from '../../store/automationLanesStore';
import { useToolStore } from '../../store/toolStore';
import { isAutomatable } from '../../synth/interfaces/Automatable';
import { NumberSynthParam } from '../../synth/interfaces/SynthParam';
import Button from '../Button.vue';
import Tooltip from '../Tooltip.vue';
import { exit } from 'process';
// TODO: this could use a refactor

const props = defineProps<{
    param: NumberSynthParam,
}>();
let mouseDownPos = {
    x: 0, y: 0,
};
let preMapValueOnDragStart = 0;
const preMapValue = ref(0);
const dragging = ref(false);
const valueDraggable = ref();
const ww = 600;
const displayValue = ref(props.param.value);
const tool = useToolStore();
const lanes = useAutomationLaneStore();
const automated = computed(() => {
    return lanes.isParameterAutomated(props.param);
});
const automationIsOpened = computed(() => {
    return tool.laneBeingEdited && (tool.laneBeingEdited.targetParameter === props.param);
});
const canBeAutomated = isAutomatable(props.param);
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
    displayValue.value = props.param.value;
}
const windowMouseMove = (e: MouseEvent) => {
    if (!dragging.value) return;
    mouseDrag(e);
}
const mouseDown = (e: MouseEvent) => {
    let taken = false;
    mouseDownPos = {
        x: e.clientX,
        y: e.clientY,
    };
    preMapValueOnDragStart = preMapValue.value;

    switch (e.button) {
        case 1: {
            if (props.param.default !== undefined) {
                props.param.value = props.param.default
                taken = true;
                break;
            }
        }
        case 0: {
            dragging.value = true;
            if (lanes.isParameterAutomated(props.param)) {
                taken = true;
                enterAutomation();
                break;
            }
            taken = true;
        }
    }
    if (taken) {
        e.stopPropagation();
        e.preventDefault();
    }

}
const mouseUp = (e: MouseEvent) => {
    if (dragging.value) {
        e.stopPropagation();
        e.preventDefault();
        dragging.value = false;
    }
}
const doubleClick = (e: MouseEvent) => {
    console.log("dblck")
    if (props.param.default !== undefined) {
        props.param.value = props.param.default
    }
}
const enterAutomation = () => {
    const automatable = isAutomatable(props.param);
    if (!automatable) throw new Error("param is not automatable");
    tool.current = Tool.Automation;
    tool.laneBeingEdited = lanes.getOrCreateAutomationLaneForParameter(automatable);
}
const exitAutomation = () => {
    tool.current = Tool.Select;
    tool.laneBeingEdited = undefined;
}
watch(props.param, (newParam) => {
    displayValue.value = newParam.value;
    const range = newParam.max - newParam.min;
    preMapValue.value = newParam.value / range;
});
onMounted(() => {
    const range = props.param.max - props.param.min;
    preMapValue.value = props.param.value / range;
    const $valueDraggable = valueDraggable.value;
    if (!$valueDraggable) {
        console.error("valueDraggable ref is " + valueDraggable.value);
        return;
    }
    $valueDraggable.addEventListener('mousedown', mouseDown);
    $valueDraggable.addEventListener('dblclick', doubleClick);
    window.addEventListener('mouseup', mouseUp);
    window.addEventListener('mousemove', windowMouseMove);
    displayValue.value = props.param.value;
});
onBeforeUnmount(() => {
    const $valueDraggable = valueDraggable.value;
    if (!$valueDraggable) {
        console.error("valueDraggable ref is " + valueDraggable.value);
        return;
    }
    $valueDraggable.removeEventListener('mousedown', mouseDown);
    $valueDraggable.removeEventListener('dblclick', doubleClick);
    window.removeEventListener('mouseup', mouseUp);
    window.removeEventListener('mousemove', windowMouseMove);
});
</script>
<template>
    <div class="prop-slider-container" ref="valueDraggable" :class="{
        active: dragging,
        automationIsOpened,
        automated,
    }
        ">
        <span v-if="automated" class="readout">
            &gt; automated &lt;
        </span>
        <Tooltip
        v-else 
            :tooltip="props.param.default !== undefined ? `middle button or double click sets it to ${props.param.default}` : ''">

            <template v-if="props.param.max !== undefined && props.param.min !== undefined">
                <div class="prog-container">
                    <div class="prog-bar" :class="{ negative: preMapValue < 0 }" :style="{
                        width: (preMapValue >= 0 ? (preMapValue) : (-preMapValue)) * 100 + '%',
                        left: (preMapValue >= 0 ? 0 : (1 - preMapValue)) * 100 + '%',
                    }">
                    </div>
                </div>
            </template>
            <span class="readout">
                {{ props.param.displayName }} &nbsp; {{ displayValue.toFixed(3) }}
            </span>
        </Tooltip>
    </div>
    <div v-if="canBeAutomated" class="lane-options-container">
        <Button v-if="automationIsOpened"  :onClick="()=>exitAutomation()" :tooltip="`Exit automation editing of ${props.param.displayName}`" class="automate">
            Exit
        </Button>
        <Button v-else :onClick="()=>enterAutomation()" :tooltip="`Automate ${props.param.displayName}`" class="automate">
            Automate
        </Button>
        
    </div>
</template>
<style scoped>
.lane-options-container {
    display: flex;
    justify-content: right;
    align-items: center;
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

.prop-slider-container {
    width: 100%;
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
    position: relative;
}

.prop-slider-container>span {
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    line-height: 1.8;
}

.readout {
    left: 0;
    top: 0;

    width: 100%;
    position: absolute;
    z-index: 2;
}

.active {
    background-color: rgb(7, 77, 99);
}

.automationIsOpened {
    border: solid 1px rgb(253, 152, 0);
    box-shadow: 0 0 10px rgb(253, 152, 0);
    z-index: 1;
}
.automated {
    border: solid 1px rgb(253, 152, 0.6);
}
</style>
