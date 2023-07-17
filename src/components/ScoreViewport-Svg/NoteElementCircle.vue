<script setup lang="ts">
import { useToolStore } from '../../store/toolStore';
import { NoteRect, useViewStore } from '../../store/viewStore';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    eventRect: NoteRect
    isEditable?: boolean
}>();

</script>
<template>
    <text class="texts" v-if="view.viewWidthTime < 10" :x="eventRect.x" :y="eventRect.cy + 5" font-size="10">
        (2^{{
            eventRect.event.octave.toFixed(3)
        }})n = {{
            eventRect.event.frequency.toFixed(3)
        }} hz {{
            eventRect.event.group?.name
        }}
    </text>
    <circle 
        class="body" 
        v-bind="$attrs"
        :class="{
            selected: eventRect.event.selected,
            editable: isEditable,
            muted: eventRect.event.mute,
        }" :cx="eventRect.cx" :cy="eventRect.cy" :r="eventRect.radius" 
    />
</template>
<style scoped>
.texts {
    pointer-events: none;
}


.body {
    stroke: #999;
    fill: #0001;
    opacity: 0.3;
}

.body.selected {
    fill: #f889;
    stroke: #f889;
    opacity: 1;
}


.body.editable {
    fill: #888a;
    opacity: 0.6;
}

.body.selected.editable {
    fill: rgba(255, 36, 36, 0.205);
}


.body.muted {
    fill: rgba(81, 81, 158, 0.541);
    stroke: #999;
}

.body.editable.muted.selected {
    fill: rgba(255, 36, 182, 0.068);
    stroke: #f889;
}

.rightEdge.editable {
    fill: #f88a;
    stroke: #999;
}

.relation {
    stroke: #999;
    stroke-width: 1;
    stroke-dasharray: 5;
}


.body:hover {
    opacity: 1 !important
}
</style>
