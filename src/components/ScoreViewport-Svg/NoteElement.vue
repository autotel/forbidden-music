<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Note } from '../../dataTypes/Note';
import { Tool } from '../../dataTypes/Tool';
import { useToolStore } from '../../store/toolStore';
import { Drawable, TimelineDot, TimelineRect, layerNoteColorStrings, useViewStore } from '../../store/viewStore';
import NoteElementCircle from './NoteElementCircle.vue';
import NoteElementRectangle from './NoteElementRectangle.vue';
import NoteVeloLine from './NoteVeloLine.vue';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    eventRect: Drawable<Note>
    text?: string
    interactionDisabled?: boolean
}>();

// TODO: there are two possible destinations for noteBody, this causes the problem that 
// id there are some circle and some rectanble notes, when coming out of view  and then back
// the ref might stop being towards the correct element and thus become unhoverable
// I had to add an ungly "key" that counts till infinite to force the component to rerender
// a better solution perhaps would be to dereference on mount
const noteBody = ref<SVGRectElement>();

const myColor = computed(() => {
    const color = layerNoteColorStrings[props.eventRect.event.layer];
    return color;
});

const bodyMouseEnterListener = (e: MouseEvent) => {
    tool.timelineItemMouseEnter(props.eventRect.event);
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    tool.timelineItemMouseLeave();
}

onMounted(() => {
    if (props.interactionDisabled) return;
    if (noteBody.value) {
        noteBody.value.addEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.addEventListener('mouseleave', bodyMouseLeaveListener);
    }
});
onBeforeUnmount(() => {
    if (props.interactionDisabled) return;
    if (noteBody.value) {
        noteBody.value.removeEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.removeEventListener('mouseleave', bodyMouseLeaveListener);
    }
});

const isEditable = computed(() => {
    return tool.current == Tool.Edit || tool.current == Tool.Modulation;
})
</script>
<template>
    <text class="texts" v-if="text" :x="eventRect.cx" :y="eventRect.cy - 10" font-size="14">
        {{ text }}
    </text>
    <g ref="noteBody" :class="{ mouseblock: (!isEditable) || interactionDisabled }">
        <NoteElementRectangle v-if="'width' in eventRect" :eventRect="eventRect" :isEditable="isEditable" :fill="myColor" />
        <NoteElementCircle v-else :eventRect="eventRect" :isEditable="isEditable" :fill="myColor" />
        <NoteVeloLine :event="eventRect.event" :interactionDisabled="interactionDisabled" :x="eventRect.cx"
            :selected="eventRect.event.selected || false" :fill="myColor" />
    </g>
</template>
<style scoped>
.mouseblock {
    pointer-events: none;
}
</style>
