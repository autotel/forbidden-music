<script setup lang="ts">
import { reactive, onMounted, onUnmounted, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { SnapExplanation, useSnapStore } from '../store/snapStore';
import { useViewStore } from '../store/viewStore';


const view = useViewStore();
const snap = useSnapStore();

const getOctaveOfSnapExplanation = (relation: SnapExplanation) => {
    if (relation.relatedNote !== undefined) {
        return relation.relatedNote.y;
    } else if (relation.relatedNumber !== undefined) {
        return relation.relatedNumber;
    } else {
        throw new Error("relation has no relatedNote or relatedValue");
    }
}


</script>
<template>
    <template v-for="relation in snap.toneSnapExplanation">
        <template v-if="relation.relatedNote && snap.focusedNote">
            <line class="relation" :x1="snap.focusedNote.x" :y1="snap.focusedNote.y" :x2="snap.focusedNote.x"
                :y2="relation.relatedNote.y" />
            <line class="relation" :x1="snap.focusedNote.x" :y1="relation.relatedNote.y" :x2="relation.relatedNote.x"
                :y2="relation.relatedNote.y" />
            <text :x="5 + snap.focusedNote.x" :y="5 + (snap.focusedNote.y + relation.relatedNote.y) / 2" font-size="10">
                {{ relation.text }}
            </text>
        </template>
        <template v-else-if="relation.relatedNumber && snap.focusedNote">
            <text :x="5 + snap.focusedNote.x"
                :y="24 + snap.focusedNote.y" font-size="10">
                {{ relation.text }}
            </text>
        </template>
        <template v-else>
            <text :x="100" :y="100" font-size="10">
                {{ relation.text }}
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