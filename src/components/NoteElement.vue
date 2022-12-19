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

const noteBody = ref<SVGRectElement>();
const rightEdge = ref<SVGRectElement>();
onMounted(() => {
    const $noteBody = noteBody.value;
    if (!$noteBody) throw new Error("noteBody not found");
    const $rightEdge = rightEdge.value;
    if (!$rightEdge) throw new Error("rightEdge not found");

    $noteBody.addEventListener('mousedown', (e) => {
        const note = props.noteRect.note;
        const startX = e.clientX;
        const startNoteStart = note.start;
        $noteBody.style.cursor = 'grabbing';
        const mouseMove = (e: MouseEvent) => {
            // this is a very wicked use of the function.
            // honestly I don't understand why it works using
            // the inverse function. It has something to do with zooming
            const timeDelta = view.timeToPx(e.clientX - startX);
            note.start = startNoteStart + timeDelta;
        };
        const mouseUp = (e: MouseEvent) => {
            $noteBody.style.cursor = 'grab';
            window.removeEventListener('mousemove', mouseMove);
            window.removeEventListener('mouseup', mouseUp);
        };
        window.addEventListener('mousemove', mouseMove);
        window.addEventListener('mouseup', mouseUp);
    });

    // make the note length resizable by dragging the right edge
    $rightEdge.addEventListener('mousedown', (e) => {
        const note = props.noteRect.note;
        const startX = e.clientX;
        const startNoteDuration = note.duration;
        $rightEdge.style.cursor = 'ew-resize';
        const mouseMove = (e: MouseEvent) => {
            // same wickedness
            const timeDelta = view.timeToPx(e.clientX - startX);
            note.duration = startNoteDuration + timeDelta;
        };
        const mouseUp = (e: MouseEvent) => {
            $rightEdge.style.cursor = 'ew-resize';
            window.removeEventListener('mousemove', mouseMove);
            window.removeEventListener('mouseup', mouseUp);
        };
        window.addEventListener('mousemove', mouseMove);
        window.addEventListener('mouseup', mouseUp);
    });

    // make the note octave property changeable by dragging vertically
    $noteBody.addEventListener('mousedown', (e) => {
        // prevent pitch change if 'alt' key is pressed
        if (e.altKey) return;
        const note = props.noteRect.note;
        const startY = e.clientY;
        const startNoteOctave = note.octave;
        $noteBody.style.cursor = 'grabbing';
        const mouseMove = (e: MouseEvent) => {
            const octaveDelta = view.pxToOctave(e.clientY - startY);
            note.octave = startNoteOctave + octaveDelta;
        };
        const mouseUp = (e: MouseEvent) => {
            $noteBody.style.cursor = 'grab';
            window.removeEventListener('mousemove', mouseMove);
            window.removeEventListener('mouseup', mouseUp);
        };
        window.addEventListener('mousemove', mouseMove);
        window.addEventListener('mouseup', mouseUp);
    });
    
    
});

</script>

<template>
    <rect class="body" ref="noteBody"  :x="noteRect.x" :y="noteRect.y" :width="noteRect.w" :height="10" />
    <rect class="rightEdge" ref="rightEdge" :x="noteRect.x + noteRect.w - 5" :y="noteRect.y" :width="5" :height="10" />
</template>

<style scoped>
.body {
    fill: #888a;
    stroke: #999;
    cursor: move;
}
.rightEdge {
    fill: #f88a;
    stroke: #999;
    cursor: ew-resize;
}
</style>
