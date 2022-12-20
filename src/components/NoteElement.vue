<script setup lang="ts">

import { onMounted, ref } from 'vue';
import { Note } from '../dataTypes/Note';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';

// get the view store
const view = useViewStore();
const tool = useToolStore();

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

    // make the note length resizable by dragging the right edge
    $rightEdge.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const note = props.noteRect.note;
        const startX = e.clientX;
        const startNoteDuration = note.duration;
        $rightEdge.style.cursor = 'ew-resize';
        
        const mouseMove = (e: MouseEvent) => {
            e.stopPropagation();

            // same wickedness
            const timeDelta = view.timeToPx(e.clientX - startX);
            note.duration = startNoteDuration + timeDelta;
        };
        const mouseUp = (e: MouseEvent) => {
            e.stopPropagation();

            $rightEdge.style.cursor = 'ew-resize';
            window.removeEventListener('mousemove', mouseMove);
            window.removeEventListener('mouseup', mouseUp);
        };
        window.addEventListener('mousemove', mouseMove);
        window.addEventListener('mouseup', mouseUp);
    });
    
    $noteBody.addEventListener('mousedown', (e) => {
        // TODO: also resize upon creation
        e.stopPropagation();
        const note = props.noteRect.note;
        const startX = e.clientX;
        const startNoteStart = note.start;
        $noteBody.style.cursor = 'grabbing';
        const mouseMove = (e: MouseEvent) => {
            e.stopPropagation();
            // this is a very wicked use of the function.
            // honestly I don't understand why it works using
            // the inverse function. It has something to do with zooming
            const timeDelta = view.timeToPx(e.clientX - startX);
            note.start = startNoteStart + timeDelta;
        };
        const mouseUp = (e: MouseEvent) => {
            e.stopPropagation();
            $noteBody.style.cursor = 'grab';
            window.removeEventListener('mousemove', mouseMove);
            window.removeEventListener('mouseup', mouseUp);
        };
        window.addEventListener('mousemove', mouseMove);
        window.addEventListener('mouseup', mouseUp);


        // drag the note up and down to change the octave
        // separated to keep clarity

        // prevent pitch change if 'alt' key is pressed
        if (e.altKey) return;

        const startY = e.clientY;
        const startNoteOctave = note.octave;
        $noteBody.style.cursor = 'grabbing';
        const mouseMoveV = (e: MouseEvent) => {
            const octaveDelta = view.pxToOctave(e.clientY - startY);
            note.octave = startNoteOctave + octaveDelta;
        };
        const mouseUpV = (e: MouseEvent) => {
            $noteBody.style.cursor = 'grab';
            window.removeEventListener('mousemove', mouseMoveV);
            window.removeEventListener('mouseup', mouseUpV);
        };
        window.addEventListener('mousemove', mouseMoveV);
        window.addEventListener('mouseup', mouseUpV);

    });


});

</script>

<template>
    <rect class="body" ref="noteBody" :x="noteRect.x" :y="noteRect.y" :width="noteRect.w" :height="10" />
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
