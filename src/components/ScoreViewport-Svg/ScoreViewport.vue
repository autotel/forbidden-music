<script setup lang="ts">
import GroupElement from './GroupElement.vue';
import TimeGrid from './MusicTimeGrid.vue';
import NoteElement from './NoteElement.vue';
import RangeSelection from './RangeSelection.vue';
import ToneGrid from './ToneGrid.vue';
import ToneRelation from './ToneRelation.vue';
import { usePlaybackStore } from '../../store/playbackStore';
import { useProjectStore } from '../../store/projectStore';
import { useToolStore } from '../../store/toolStore';
import { layerNoteColors, useViewStore } from '../../store/viewStore';
import { onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';

const project = useProjectStore();
const tool = useToolStore();
const playback = usePlaybackStore();
const view = useViewStore();
const timedEventsViewport = ref<SVGSVGElement>();


const props = defineProps<{
    width: number,
    height: number,
}>();


onMounted(() => {
    const $viewPort = timedEventsViewport.value;
    if (!$viewPort) throw new Error("timedEventsViewport not found");
})

onBeforeUnmount(() => {
    const $viewPort = timedEventsViewport.value;
    if (!$viewPort) throw new Error("timedEventsViewport not found");
});


</script>
<template>
    <svg id="viewport" ref="timedEventsViewport" :class="tool.cursor">
        <g id="grid">
            <TimeGrid />
            <ToneGrid />
        </g>
        <g id="tone-relations">
            <ToneRelation />
        </g>
        <g id="groups-container">
            <g v-for="group in project.groups" :key="group.id">
                <GroupElement :group="group" />
            </g>
        </g>
        <g id="note-would-be-created">
            <NoteElement 
                v-if="tool.noteThatWouldBeCreated" 
                :eventRect="view.rectOfNote(tool.noteThatWouldBeCreated)"
                interactionDisabled />
        </g>
        <line id="playbar" :x1=playback.playbarPxPosition y1="0" :x2=playback.playbarPxPosition y2="100%"
            stroke-width="1" />
        <g id="edit-notes">
            <NoteElement v-for="rect in view.visibleNoteRects" :eventRect="rect" />
        </g>
        <g id="notes-being-created">
            <NoteElement v-for="rect in tool.notesBeingCreated" :eventRect="view.rectOfNote(rect)" />
        </g>
        <RangeSelection />
    </svg>
</template>
<style>


svg#viewport{
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

svg#viewport.cursor-draw {
    cursor: url("./assets/icons-iconarchive-pen.png?url") 3 3, crosshair;
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

g#notes-being-created rect.body {
    fill: transparent;
}
</style>