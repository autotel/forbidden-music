<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Tooltip from '../../../components/Tooltip.vue';
import { abbreviate } from '../../../functions/abbreviate';
import { NumberSynthParam } from '../../../synth/interfaces/SynthParam';
import { AutomatableSynthParam, isAutomatable } from '../../../synth/interfaces/Automatable';
import { useAutomationLaneStore } from '../../../store/automationLanesStore';
import { useToolStore } from '../../../store/toolStore';
import { Tool } from '../../../dataTypes/Tool';
import { usePlaybackStore } from '../../../store/playbackStore';
import { AutomationLane } from '../../../dataTypes/AutomationLane';
import { automationPoint } from '../../../dataTypes/AutomationPoint';
import { useProjectStore } from '../../../store/projectStore';
const props = defineProps<{
    param: NumberSynthParam
}>();

const emit = defineEmits(['update']);
const automation = useAutomationLaneStore();
const tool = useToolStore();
const project = useProjectStore();
let mouseDownPos = {
    x: 0, y: 0,
};
const playback = usePlaybackStore();
const knobAngle = (angle: number) => {
    angle *= 270;
    angle -= 45;
    return `transform:rotate(${angle}deg)`;
}

const automated = computed<AutomationLane | undefined>(() => {
    if (automation.isParameterAutomated(props.param)) {
        const aParam: AutomatableSynthParam = props.param as AutomatableSynthParam;
        const lane = automation.getOrCreateAutomationLaneForParameter(aParam);
        return lane;
    } else {
        return undefined;
    }
});

const automationLaneIsOpen = computed(() => {
    return tool.laneBeingEdited && (tool.laneBeingEdited.targetParameter === props.param) && tool.current === Tool.Automation;
});
const canBeAutomated = isAutomatable(props.param);

const enterAutomation = () => {
    const automatable = isAutomatable(props.param);
    if (!automatable) throw new Error("param is not automatable");
    tool.current = Tool.Automation;
    tool.laneBeingEdited = automation.getOrCreateAutomationLaneForParameter(automatable);
}
const exitAutomation = () => {
    tool.current = Tool.Edit;
    tool.laneBeingEdited = undefined;
}
const toggleShowAutomation = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (automationLaneIsOpen.value) {
        exitAutomation();
    } else {
        enterAutomation();
    }
}


const abbreviatedName = computed(() => {
    if (!props.param.displayName) return '';
    // return props.param.displayName;
    return abbreviate(props.param.displayName, 10);
});

const paramValueToLocalValue = () => {
    if (automated.value) {
        const automationPointsAround = getAutomationPointsAroundCurrentTime();
        if (automationPointsAround.length > 1) {
            const interpValue = automation.getValueBetweenTwoPoints(
                automationPointsAround[0].point,
                automationPointsAround[1].point,
                playback.currentScoreTime
            );
            localValue.value = interpValue;
        } else {
            const eitherPoint = automationPointsAround.find(({ point }) => point);
            if (!eitherPoint) return;
            localValue.value = eitherPoint.point.value;
        }
    } else {
        localValue.value = (props.param.value - props.param.min) / (props.param.max - props.param.min);
    }
}

const localValueToParamValue = () => {
    props.param.value = (localValue.value * (props.param.max - props.param.min) + props.param.min);
}

const mouseCaptureCanvas = ref<HTMLCanvasElement | null>(null);
const localValue = ref(0);

const dragging = ref(false);
const ww = 600;

watch(() => props.param.value, () => {
    paramValueToLocalValue();
    emit('update');
});
// setInterval(() => {
//     console.log("start interval", props.param.displayName);
//     paramValueToLocalValue();
//     emit('update');

// }, 200)
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


const getAutomationPointsAroundCurrentTime = () => {
    const lane = automated.value;
    if (undefined === lane) throw new Error('lane is undefined');
    const automationPointsAround = automation.getAutomationPointsAroundTime(playback.currentScoreTime, [lane]);
    return automationPointsAround;
}

const clamp01 = (val: number) => {
    if (val > 1) {
        return 1;
    }
    if (val < 0) {
        return 0;
    }
    return val;
}

const mouseDragDelta = ({ x, y }: { x: number, y: number }) => {
    const prevLocalValue = localValue.value;
    let val = localValue.value - (y / ww);
    val = clamp01(val);
    if (automated.value) {
        const valDelta = val - prevLocalValue;
        const automationPointsAround = getAutomationPointsAroundCurrentTime();
        if (automationPointsAround.length == 0) {
            const np = automationPoint({
                time: playback.currentScoreTime,
                value: prevLocalValue,
                layer: tool.currentLayerNumber,
            })
            automated.value.content.push(np);
            automated.value.content.sort((a, b) => a.time - b.time);
        }
        automationPointsAround.forEach(({ point }) => {
            point.value = clamp01(point.value + valDelta);
        });
        paramValueToLocalValue();
    } else {
        localValue.value = val;
    }
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
        await mouseCaptureCanvas.value?.requestPointerLock();
        // better practice would be to make this on listener document.addEventListener("pointerlockchange", lockChangeAlert, false);
        if (document.pointerLockElement === mouseCaptureCanvas.value) {
            console.log("The pointer lock status is now locked");
            // window.addEventListener("mousemove", lockedPointerMoved, false);
        }
    }
    catch (e) {
        console.warn('pointer lock did not work');
    }
    if (automated.value) {
        enterAutomation();
    }
    window.addEventListener('mousemove', windowMouseMove);
    window.addEventListener('mouseup', mouseUp);
    dragging.value = true;
    mouseDownPos = {
        x: e.clientX,
        y: e.clientY,
    };
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
    if (props.param.tooltip) return props.param.tooltip;
    return props.param.displayName;
});
</script>
<template>
    <Tooltip :tooltip="tooltip" :force-hide="dragging">
        <div class="prevent-select knob-layout" :class="{ automated, automationLaneIsOpen }">

            <div v-if="true" class="knob" @mousedown="mouseDown" @mouseenter="addWheelListeners"
                @mouseleave="removeWheelListeners">
                <div :style="knobAngle(localValue)">
                    <canvas ref="mouseCaptureCanvas" width="8" height="2.5"></canvas>
                </div>
            </div>
            <small>{{ abbreviatedName }}</small>
            <small>{{ props.param.displayValue || props.param.value.toFixed(2) }}</small>
            <Tooltip :tooltip="automated ? 'Edit automation. [Ctl+A] & [Del] To erase' : 'automate parameter'"
                :force-hide="dragging">
                <button class="animate-button" v-if="canBeAutomated" :class="{ on: automationLaneIsOpen }"
                    @click="toggleShowAutomation">A</button>
            </Tooltip>
        </div>
    </Tooltip>
</template>
<style scoped>
/* .automated .knob div {
    visibility: hidden;
} */

.knob-layout {
    width: 4em;
    height: fit-content;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.2em;
    position: relative;
}

.knob {
    display: inline-block;
    border: solid 1px;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    fill: currentcolor;
    cursor: grab;
}

.automated .knob {
    cursor: pointer;
}

.automationLaneIsOpen .knob {
    cursor: pointer;
    background-color: orange;
}

.knob>* {
    transform-origin: center;
    opacity: 0.7;
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
}

.knob canvas {
    background-color: currentcolor;
    /* position: absolute; */
    position: relative;
    top: -0.5px
}

.knob:hover {
    box-shadow: 0.3em 0.3em 0.6em rgba(0, 0, 0, 0.356);
}

small {
    white-space: nowrap;
}


.automated .animate-button {
    background-color: orange;
}


.automationLaneIsOpen .animate-button {
    background-color: orange;
    mix-blend-mode: screen;
}

.animate-button {
    position: absolute;
    right: 0;
    top: -2px;
    background-color: rgb(124, 113, 91);
    border: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    overflow: hidden;
    font-size: 0.5em;
    padding: 0;
    text-align: center;
    z-index: 1;
    cursor: pointer;
}

.animate-button:hover {
    box-shadow: 0px 0px 5px rgba(255, 193, 78, 0.479);
    background-color: orange;
    mix-blend-mode: screen;
}
</style>
