<script setup lang="ts">

import { onMounted, ref } from 'vue';
import { Note } from '../dataTypes/Note';
import { useViewStore } from '../store/viewStore';

// get the view store
const view = useViewStore();

const props = defineProps<{
    noteRect: {
        x: number,
        y: number,
        w: number,
        note: Note,
    }
}>()

const noteElement = ref<SVGRectElement>();
onMounted(() => {
    const $noteElement = noteElement.value;
    if (!$noteElement) throw new Error("noteElement not found");

    $noteElement.addEventListener('mousedown', (e) => {
        const note = props.noteRect.note;
        const startX = e.clientX;
        const startNoteStart = note.start;
        $noteElement.style.cursor = 'grabbing';
        const mouseMove = (e: MouseEvent) => {
            // this is a very wicked use of the function.
            // honestly I don't understand why it works using
            // the inverse function. It has something to do with zooming
            const timeDelta = view.timeToPx(e.clientX - startX);
            note.start = startNoteStart + timeDelta;
        };
        const mouseUp = (e: MouseEvent) => {
            $noteElement.style.cursor = 'grab';
            window.removeEventListener('mousemove', mouseMove);
            window.removeEventListener('mouseup', mouseUp);
        };
        window.addEventListener('mousemove', mouseMove);
        window.addEventListener('mouseup', mouseUp);
    });
    
});

</script>

<template>
    <rect ref="noteElement"  :x="noteRect.x" :y="noteRect.y" :width="noteRect.w" :height="10" />
</template>

<style scoped>
rect {
    fill: #888a;
    stroke: #999;
    cursor: grab;
}
</style>
