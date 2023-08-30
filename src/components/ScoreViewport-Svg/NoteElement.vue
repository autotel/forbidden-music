<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Tool } from '../../dataTypes/Tool';
import { useToolStore } from '../../store/toolStore';
import { NoteRect, layerNoteColorStrings, layerNoteColors, useViewStore } from '../../store/viewStore';
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

const myColor = computed(() => {
    const color = layerNoteColorStrings[props.eventRect.event.layer];
    return color;
});

const bodyMouseEnterListener = (e: MouseEvent) => {
    tool.noteMouseEnter(props.eventRect.event);
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    tool.noteMouseLeave();
}

onMounted(() => {
    if (props.interactionDisabled) return;
    if (noteBody.value) {
        noteBody.value.addEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.addEventListener('mouseleave', bodyMouseLeaveListener);
    }
});
onUnmounted(() => {
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
    <text class="texts" v-if="view.viewWidthTime < 5" :x="eventRect.x" :y="eventRect.cy + 10" font-size="20">
        (2^{{
            eventRect.event.octave.toFixed(3)
        }})n = {{
    eventRect.event.frequency.toFixed(3)
}} hz {{
    eventRect.event.group?.name
}}
    </text>
    <g ref="noteBody" :class="{ mouseblock: !isEditable }">
        <NoteElementRectangle v-if="eventRect.event.duration > 0" :eventRect="eventRect" :isEditable="isEditable"
            :fill="myColor" />
        <NoteElementCircle v-else :eventRect="eventRect" :isEditable="isEditable" :fill="myColor" />
        <NoteVeloLine :event="eventRect.event" :interactionDisabled="interactionDisabled" :x="eventRect.cx"
            :selected="eventRect.event.selected" :fill="myColor" />
    </g>
</template>
<style scoped>
.mouseblock {
    pointer-events: none;
}
</style>
