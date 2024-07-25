<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Tool } from '../../dataTypes/Tool';
import { TraceType } from '../../dataTypes/Trace';
import { usePlaybackStore } from '../../store/playbackStore';
import { useToolStore } from '../../store/toolStore';
import { useViewStore } from '../../store/viewStore';
import AutomationCircle from './AutomationCircle.vue';
import LoopRangeElement from './LoopRangeElement.vue';
import TimeGrid from './MusicTimeGrid.vue';
import NoteElement from './NoteElement.vue';
import RangeSelection from './RangeSelection.vue';
import ToneGrid from './ToneGrid.vue';
import ToneRelation from './ToneRelation.vue';

const tool = useToolStore();
const playback = usePlaybackStore();
const view = useViewStore();
const timedEventsViewport = ref<SVGSVGElement>();

defineProps<{
    width: number,
    height: number,
}>();


const notesAreGreyed = computed(() => (tool.current !== Tool.Edit))
const loopsAreGreyed = computed(() => (tool.current !== Tool.Edit && tool.current !== Tool.Loop))
// when making other lanes visible, use (lane)=>(tool.current !== Tool.Automation || tool.laneBeingEdited !== lane)
const automationLaneIsGreyed = false

onMounted(() => {
    const $viewPort = timedEventsViewport.value;
    if (!$viewPort) throw new Error("timedEventsViewport not found");
})

onBeforeUnmount(() => {
    const $viewPort = timedEventsViewport.value;
    if (!$viewPort) throw new Error("timedEventsViewport not found");
});


//  :text="snap.nonRelationalTimeSnapExplanation() + '\n' + snap.nonRelationalToneSnapExplanation()"
</script>
<template>
    <svg id="viewport" ref="timedEventsViewport" :class="tool.cursor">
        <!-- graphic helpers -->
        <line id="playbar" :x1=playback.playbarPxPosition y1="0" :x2=playback.playbarPxPosition y2="100%"
            stroke-width="1" />
        <g id="grid">
            <TimeGrid />
            <ToneGrid />
        </g>
        <!-- traces that would be created upon click -->
        <g id="note-would-be-created" v-if="tool.current === Tool.Edit">
            <NoteElement v-if="tool.noteThatWouldBeCreated" :eventRect="view.rectOfNote(tool.noteThatWouldBeCreated)"
                interactionDisabled />
        </g>
        <g id="loop-would-be-created" v-if="tool.current === Tool.Loop">
            <LoopRangeElement v-if="tool.loopThatWouldBeCreated"
                :eventRect="view.rectOfLoop(tool.loopThatWouldBeCreated)" interactionDisabled />
        </g>
        <g id="automation-point-would-be-created" v-if="tool.current === Tool.Automation">
            <AutomationCircle v-if="tool.automationPointThatWouldBeCreated"
                :circle="view.dotOfAutomationPoint(tool.automationPointThatWouldBeCreated)" interactionDisabled />
        </g>

        <!-- traces that actually exist in the project -->
        <g id="loop-ranges-container" class="traces-container loops">
            <LoopRangeElement v-for="loopRect in view.visibleLoopDrawables" :eventRect="loopRect"
                :greyed="loopsAreGreyed" />
        </g>
        <g id="notes-container" class="traces-container notes">
            <NoteElement v-for="rect in view.visibleNoteDrawables" :eventRect="rect" :greyed="notesAreGreyed"/>
        </g>
        <g id="automation-container" class="traces-container automation">
            <AutomationCircle v-for="(circle, index) in view.visibleAutomationPointDrawables" :circle="circle"
                :nextCircle="view.visibleAutomationPointDrawables[index + 1]" :key="index"
                :greyed="automationLaneIsGreyed" />
        </g>

        <!-- others -->
        <g id="traces-being-created">
            <template v-for="trace in tool.mouse.tracesBeingCreated">
                <NoteElement v-if="trace.type === TraceType.Note" :eventRect="view.rectOfNote(trace)" />

                <LoopRangeElement v-if="trace.type === TraceType.Loop" :eventRect="view.rectOfLoop(trace)"
                    interactionDisabled />
            </template>
        </g>

        <g id="tone-relations" v-if="tool.current === Tool.Edit">
            <ToneRelation />
        </g>
        <RangeSelection />
    </svg>
</template>
<style>
#tone-relations {
    pointer-events: none;
}

svg#viewport {
    width: 100%;
    height: 100%;
}

svg#viewport.cursor-note-length {
    cursor: col-resize;
    cursor: ew-resize;
}

svg #playbar {
    stroke: rgb(95, 0, 0);
}

@media (prefers-color-scheme: dark) {

    svg #playbar {
        stroke: rgba(193, 167, 223, 0.479);
    }
}

svg#viewport.cursor-draw {
    cursor: url("../../assets/icons-iconarchive-pen.png") 3 3, crosshair;
}

svg#viewport.cursor-move {
    cursor: move;
}

svg#viewport.cursor-grab {
    cursor: grab;
}

svg#viewport.cursor-grabbing {
    cursor: grabbing;
}

svg#viewport {
    position: absolute;
    top: 0;
    left: 0;
    border: 1px solid rgb(230, 223, 215);
}

@media (prefers-color-scheme: dark) {

    svg#viewport {
        border: 1px solid rgba(230, 223, 215, 0.527);
    }

}

g#notes-being-created rect.body {
    fill: transparent;
}

.traces-container .body {
    opacity: 0.7;
}

.traces-container .body.selected.editable {
    /* fill: rgba(255, 51, 0, 0.644); */
    stroke: rgb(125, 125, 126);
    stroke-width: 1px;
    opacity: 1;
}

.traces-container .body.muted.selected {
    opacity: 0.5;
}

.traces-container .body.greyed {
    stroke: #0005;
    fill: #0001;
    opacity: 0.4;
}

@media (prefers-color-scheme: dark) {
    .traces-container .body.greyed {
        stroke: rgba(255, 255, 255, 0.438);
    }
}

.traces-container .body.muted {
    opacity: 0.3;
}

.traces-container .edge-handle {
    fill: #f88a;
    stroke: none;
    opacity: 0.1;
    cursor: ew-resize;
}

.traces-container .body:hover {
    opacity: 1;
}

.loops .body {
    fill: rgb(255, 183, 164);
}

#automation-point-would-be-created circle,
.automation line,
.automation circle {
    stroke: rgba(253, 152, 0);
    fill: #0000;
}


.automation line.selected,
.automation circle.selected {
    stroke-width: 3px;
}
</style>