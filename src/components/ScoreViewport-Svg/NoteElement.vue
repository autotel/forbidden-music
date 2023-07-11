<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Tool } from '../../dataTypes/Tool';
import { useToolStore } from '../../store/toolStore';
import { NoteRect, useViewStore } from '../../store/viewStore';
import NoteElementCircle from './NoteElementCircle.vue';
import NoteElementRectangle from './NoteElementRectangle.vue';
import NoteVeloLine from './NoteVeloLine.vue';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    eventRect: NoteRect
    interactionDisabled?: boolean
}>();

// TODO: there are two possible destinations for noteBody, this causes the problem that 
// id there are some circle and some rectanble notes, when coming out of view  and then back
// the ref might stop being towards the correct element and thus become unhoverable
// I had to add an ungly "key" that counts till infinite to force the component to rerender
// a better solution perhaps would be to dereference on mount
const noteBody = ref<SVGRectElement>();
const rightEdge = ref<SVGRectElement>();

const bodyMouseEnterListener = (e: MouseEvent) => {
    tool.noteMouseEnter(props.eventRect.event);
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    tool.noteMouseLeave();
}
const rightEdgeMouseEnterListener = (e: MouseEvent) => {
    tool.noteRightEdgeMouseEnter(props.eventRect.event);
}
const rightEdgeMouseLeaveListener = (e: MouseEvent) => {
    tool.noteRightEdgeMouseLeave();
}

onMounted(() => {
    if (props.interactionDisabled) return;
    if (noteBody.value) {
        noteBody.value.addEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.addEventListener('mouseleave', bodyMouseLeaveListener);
    }
    if (rightEdge.value) {
        rightEdge.value.addEventListener('mouseenter', rightEdgeMouseEnterListener);
        rightEdge.value.addEventListener('mouseleave', rightEdgeMouseLeaveListener);
    }
});
onUnmounted(() => {
    if (props.interactionDisabled) return;
    if (noteBody.value) {
        noteBody.value.removeEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.removeEventListener('mouseleave', bodyMouseLeaveListener);
    }
    if (rightEdge.value) {
        rightEdge.value.removeEventListener('mouseenter', rightEdgeMouseEnterListener);
        rightEdge.value.removeEventListener('mouseleave', rightEdgeMouseLeaveListener);
    }
});

const isEditable = computed(() => {
    return tool.current == Tool.Edit && tool.currentlyActiveGroup === props.eventRect.event.group;
})
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
    <g ref="noteBody">
        <NoteElementRectangle
            v-if="eventRect.event.duration > 0"
            :eventRect="eventRect" 
            :isEditable="isEditable"
        />
        <NoteElementCircle 
            v-else
            :eventRect="eventRect" 
            :isEditable="isEditable"
        />
        <NoteVeloLine 
            :event="eventRect.event" 
            :interactionDisabled="interactionDisabled" 
            :x="eventRect.cx" 
            :selected="eventRect.event.selected"
        />
    </g>
</template>