<script setup lang="ts">
import { computed } from 'vue';
import { useSnapStore } from '../../store/snapStore';
import { NoteRect, useViewStore } from '../../store/viewStore';

const snap = useSnapStore();
const view = useViewStore();

interface RelatedNoteRect extends NoteRect {
    text: string,
    relatedNumber?: number
}

const focusedNoteRect = computed(() => {
    return snap.focusedNote ? view.rectOfNote(snap.focusedNote) : undefined;
});

const relatedNoteRects = computed<(RelatedNoteRect | undefined)[]>(() => {
    return snap.toneSnapExplanation.map((relation) => {
        return relation.relatedNote ? {
            ...view.rectOfNote(relation.relatedNote),
            text: relation.text, 
            relatedNumber: relation.relatedNumber,
        } as RelatedNoteRect: undefined;
    });
});



</script>
<template>
    <template v-for="relatedNoteRect in relatedNoteRects">
        <template v-if="relatedNoteRect?.event && focusedNoteRect">
            <line class="relation" 
                :x1="focusedNoteRect.cx" 
                :y1="focusedNoteRect.cy" 
                :x2="focusedNoteRect.cx"
                :y2="relatedNoteRect.cy"
            />
            <line class="relation" 
                :x1="focusedNoteRect.cx" 
                :y1="relatedNoteRect.cy" 
                :x2="relatedNoteRect.cx"
                :y2="relatedNoteRect.cy"
            />
            <text
                :x="5 + focusedNoteRect.cx"
                :y="5 + (focusedNoteRect.cy + relatedNoteRect.cy) / 2" 
                font-size="10"
            >
                {{ relatedNoteRect.text }}
            </text>
        </template>
        <template v-else-if="relatedNoteRect?.relatedNumber && focusedNoteRect">
            <text
                :x="5 + focusedNoteRect.cx"
                :y="24 + focusedNoteRect.cy"
                font-size="10"
            >
                {{ relatedNoteRect.text }}
            </text>
        </template>
        <template v-else-if="focusedNoteRect">
            <text
                :x="5 + focusedNoteRect.cx"
                :y="24 + focusedNoteRect.cy"
                font-size="10"
            >
                {{ relatedNoteRect?.text }}
            </text>
        </template>
        <template v-else>
            <text
                :x="100"
                :y="100" 
                font-size="10"
            >
                []{{ relatedNoteRect?.text }}{{ focusedNoteRect ? true : false }}
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