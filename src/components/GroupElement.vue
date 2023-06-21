<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { Tool } from '../dataTypes/Tool';
import { useSelectStore } from '../store/selectStore';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
import { Group } from '../dataTypes/Group';
import { vi } from 'vitest';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    group: Group
    interactionDisabled?: boolean
}>();

const groupBody = ref<SVGRectElement>();
const rightEdge = ref<SVGRectElement>();

const bodyMouseEnterListener = (e: MouseEvent) => {
    tool.groupMouseEnter(props.group);
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    tool.groupMouseLeave();
}
// const rightEdgeMOuseEnterListener = (e: MouseEvent) => {
//     tool.groupRightEdgeMouseEnter(props.group);
// }
// const rightEdgeMouseLeaveListener = (e: MouseEvent) => {
//     tool.groupRightEdgeMouseLeave();
// }
onMounted(() => {
    if (groupBody.value) {
        groupBody.value.addEventListener('mouseenter', bodyMouseEnterListener);
        groupBody.value.addEventListener('mouseleave', bodyMouseLeaveListener);
    }
    // if (rightEdge.value) {
    //     rightEdge.value.addEventListener('mouseenter', rightEdgeMOuseEnterListener);
    //     rightEdge.value.addEventListener('mouseleave', rightEdgeMouseLeaveListener);
    // }
});
onUnmounted(() => {
    if (props.interactionDisabled) return;
    if (groupBody.value) {
        groupBody.value.removeEventListener('mouseenter', bodyMouseEnterListener);
        groupBody.value.removeEventListener('mouseleave', bodyMouseLeaveListener);
    }
    // if (rightEdge.value) {
    //     rightEdge.value.removeEventListener('mouseenter', rightEdgeMOuseEnterListener);
    //     rightEdge.value.removeEventListener('mouseleave', rightEdgeMouseLeaveListener);
    // }
});

const _rect = () => {
    return {
        x: view.timeToPxWithOffset(props.group.time),
        y: view.octaveToPxWithOffset(props.group.octaveEnd),
        width: view.timeToPx(props.group.timeEnd - props.group.time),
        height: Math.abs(view.octaveToPx(props.group.octaveEnd - props.group.octave)),
    }
}

const rect = computed(() => _rect());


</script>
<template>
    <g :id="'group' + group.name">
        <text class="texts" v-if="view.viewWidthTime < 50" :x="rect.x" :y="rect.y + 5" font-size="10">
            {{ group.name }}
        </text>
        <rect class="body" :class="{
            selected: tool.currentlyActiveGroup == group,
            editable: tool.currentlyActiveGroup == group,
            interactionDisabled: interactionDisabled,
            // muted: group.mute,
        }" :...=rect ref="groupBody" />
        <!-- <rect v-if="!interactionDisabled" class="rightEdge" :class="{
            selected: group.selected,
            editable: tool.current == Tool.Edit,
            interactionDisabled: interactionDisabled,
        }" ref="rightEdge" :...=group.rightEdge :data-key="group.udpateFlag" :style="{ opacity: group.velocity }" /> -->
    </g>
</template>
<style scoped>
.texts {
    pointer-events: none;
}

.body {
    stroke: #999;
    stroke-dasharray: 4;
    fill:none;
}

.veloline {
    stroke: #0001;
}

.body.selected {
    fill: rgba(24, 90, 102, 0.37);
    stroke-dasharray: none;
}

.veloline.selected {
    stroke: #f889;
}


.body.selected.body.editable {
    fill: rgba(255, 36, 36, 0.205);
}


.body.muted {
    opacity: 0.4 !important;
    fill: rgba(81, 81, 158, 0.541);
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

.body:hover {
    opacity: 1 !important
}
</style>
