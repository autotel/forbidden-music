<script setup lang="ts">
import { Note } from '../../dataTypes/Note';
import { useToolStore } from '../../store/toolStore';
import { TimelineDot, TimelineRect, useViewStore } from '../../store/viewStore';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    eventRect: TimelineDot<Note>
    isEditable?: boolean,
    greyed?:boolean,
}>();

</script>
<template>
    <circle 
        class="body" 
        v-bind="$attrs"
        :class="{
            selected: eventRect.event.selected,
            editable: isEditable,
            muted: eventRect.event.mute,
        }" :cx="eventRect.x" :cy="eventRect.y" :r="eventRect.radius" 
    />
</template>