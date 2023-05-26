<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { Tool } from '../dataTypes/Tool';
import { useSelectStore } from '../store/selectStore';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    editNote: EditNote
    interactionDisabled?: boolean
    sounds?: boolean
}>();

const noteBody = ref<SVGRectElement>();
const rightEdge = ref<SVGRectElement>();

const bodyMouseEnterListener = (e: MouseEvent) => {
    tool.noteMouseEnter(props.editNote);
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    tool.noteMouseLeave();
}
const rightEdgeMOuseEnterListener = (e: MouseEvent) => {
    tool.noteRightEdgeMouseEnter(props.editNote);
}
const rightEdgeMouseLeaveListener = (e: MouseEvent) => {
    tool.noteRightEdgeMouseLeave();
}
onMounted(() => {
    if (noteBody.value) {
        noteBody.value.addEventListener('mouseenter', bodyMouseEnterListener);
        noteBody.value.addEventListener('mouseleave', bodyMouseLeaveListener);
    }
    if (rightEdge.value) {
        rightEdge.value.addEventListener('mouseenter', rightEdgeMOuseEnterListener);
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
        rightEdge.value.removeEventListener('mouseenter', rightEdgeMOuseEnterListener);
        rightEdge.value.removeEventListener('mouseleave', rightEdgeMouseLeaveListener);
    }
});
</script>
<template>
    <text v-if="view.viewWidthTime < 16" :x="editNote.x" :y="editNote.y + 5" font-size="10">
       (2^{{ editNote.note.octave.toFixed(3) }})n = {{ editNote.note.frequency.toFixed(3) }} hz
    </text>
    <template v-if="editNote.note.duration">
        <rect class="body" :class="{
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
            interactionDisabled: interactionDisabled,
            muted: !sounds,
        }" :...=editNote.rect ref="noteBody" />
        <rect v-if="!interactionDisabled" class="rightEdge" :class="{
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
            interactionDisabled: interactionDisabled,
        }" ref="rightEdge" :...=editNote.rightEdge :data-key="editNote.udpateFlag" />
    </template>
    <template v-else>
        <circle class="body" :class="{
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
            interactionDisabled: interactionDisabled,
        }" ...=editNote.circle ref="noteBody" />
        <!-- <rect v-if="!interactionDisabled && editNote.selected" class="rightEdge" :class="{
            selected: editNote.selected,
            editable: tool.current == Tool.Edit,
            interactionDisabled: interactionDisabled,
        }" ref="rightEdge" :...=editNote.rightEdge :data-key="editNote.udpateFlag" /> -->
    </template>
</template>
<style scoped>
.body {
    stroke: #999;
    fill: #0001;
}

.body.selected {
    fill: #f889;
}

.body.muted{
    fill: rgba(136, 136, 136, 0.274);
}

.body.editable {
    fill: #888a;
}

.body.selected.body.editable {
    fill: rgba(255, 36, 36, 0.205);
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

.body.interactionDisabled {
    pointer-events: none;
    fill: #ccc4;
}
</style>
