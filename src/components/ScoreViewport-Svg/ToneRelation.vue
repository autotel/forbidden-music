<script setup lang="ts">
import { computed } from 'vue';
import { useSnapStore } from '../../store/snapStore';
import { NoteRect, useViewStore } from '../../store/viewStore';
import { TraceType } from '../../dataTypes/Trace';
import { ScreenCoord } from '../../dataTypes/ScreenCoord';

const snap = useSnapStore();
const view = useViewStore();

interface RelatedTraceDisp extends ReturnType<typeof view.locationOfTrace> {
    text: string,
    relatedNumber?: number
}

const focusedTraceRect = computed(() => {
    if(snap.focusedTrace) {
        return view.locationOfTrace(snap.focusedTrace);
    }
});

const relatedTraceLocations = computed<(RelatedTraceDisp | undefined)[]>(() => {
    return snap.toneSnapExplanation.map((relation) => {
        return relation.relatedNote ? {
            ...view.locationOfTrace(relation.relatedNote),
            text: relation.text, 
            relatedNumber: relation.relatedNumber,
        } as RelatedTraceDisp: undefined;
    });
});



</script>
<template>
    <template v-for="relatedTraceLoc in relatedTraceLocations">
        <template v-if="relatedTraceLoc?.trace && focusedTraceRect">
            <line class="relation" 
                :x1="focusedTraceRect.x" 
                :y1="focusedTraceRect.y" 
                :x2="focusedTraceRect.x"
                :y2="relatedTraceLoc.y"
            />
            <line class="relation" 
                :x1="focusedTraceRect.x" 
                :y1="relatedTraceLoc.y" 
                :x2="relatedTraceLoc.x"
                :y2="relatedTraceLoc.y"
            />
            <text
                :x="5 + focusedTraceRect.x"
                :y="5 + (focusedTraceRect.y + relatedTraceLoc.y) / 2" 
                font-size="10"
            >
                {{ relatedTraceLoc.text }}
            </text>
        </template>
        <template v-else-if="relatedTraceLoc?.relatedNumber && focusedTraceRect">
            <text
                :x="5 + focusedTraceRect.x"
                :y="24 + focusedTraceRect.y"
                font-size="10"
            >
                {{ relatedTraceLoc.text }}
            </text>
        </template>
        <template v-else-if="focusedTraceRect">
            <text
                :x="5 + focusedTraceRect.x"
                :y="24 + focusedTraceRect.y"
                font-size="10"
            >
                {{ relatedTraceLoc?.text }}
            </text>
        </template>
        <template v-else>
            <text
                :x="100"
                :y="100" 
                font-size="10"
            >
                []{{ relatedTraceLoc?.text }}{{ focusedTraceRect ? true : false }}
            </text>
        </template>
    </template>
</template>
<style scoped>
.relation {
    stroke: rgba(117, 37, 221, 0.884);
    stroke-width: 1;
    stroke-dasharray: 5, 5;
}
</style>