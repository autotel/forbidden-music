<script setup lang="ts">

import { onMounted, ref } from 'vue';
import { Note } from '../dataTypes/Note';
import { useToolStore } from '../store/toolStore';
import { useViewStore } from '../store/viewStore';
import Fraction from 'fraction.js';
import ToolSelector from './ToolSelector.vue';
// get the view store
const view = useViewStore();
const tool = useToolStore();

const toneRelations = ref<Array<{
    value: number,
    text: string,
    xPosition: number,
    distancePx: number,

}>>();

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
/**
 * gets a list of fractional relations to each other note visible in view
 */
const getRelationsList = (withOctave: number) => {
    return view.visibleNotes
        .filter(n => n.octave !== withOctave)
        .map(n => {
            const distancePx = view.octaveToPx(n.octave - withOctave);
            if (withOctave === 0) {
                return { value: 0, text: "!", xPosition: 0, distancePx }
            }
            const value = n.octave / withOctave;
            const text = withOctave == 0 ? `!` : `${new Fraction(value).simplify(tool.simplify).toFraction(true)}`;
            const xPosition = view.timeToPx(n.start + n.duration / 2) - view.timeToPx(view.timeOffset);
            return { value, text, xPosition, distancePx };
        }) as Array<{ value: number, text: string, xPosition: number, distancePx: number }>;
}
/**
 * refreshes the relations list
 */
const recalcRelations = () => {

    const note = props.noteRect.note;
    const relations = getRelationsList(note.octave);
    toneRelations.value = relations;
}

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
            const timeDelta = view.pxToTime(e.clientX - startX);
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
            const timeDelta = view.pxToTime(e.clientX - startX);
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

        const relationalSnaps = [] as number[];

        // Object.keys(tool.snaps).forEach(snapName => {
        //     console.log("snap", snapName, tool.snaps[snapName]);
        //     if (tool.snaps[snapName] === false) return false;
        //     const numberValue = snapName.match(/(\d+)/)?.[0];
        //     if (numberValue === undefined) return false;
        //     return relationalSnaps.push(parseInt(numberValue));
        // });

        // console.log("relational snaps", relationalSnaps);

        $noteBody.style.cursor = 'grabbing';
        const mouseMoveV = (e: MouseEvent) => {
            const octaveDelta = view.pxToOctave(e.clientY - startY);

            let targetOctave = startNoteOctave + octaveDelta;

            tool.snap(
                note, 
                targetOctave, 
                view.visibleNotes.filter(
                    n => n.octave !== startNoteOctave
                )
            );

            recalcRelations();

        };
        const mouseUpV = (e: MouseEvent) => {
            $noteBody.style.cursor = 'grab';
            window.removeEventListener('mousemove', mouseMoveV);
            window.removeEventListener('mouseup', mouseUpV);
        };
        window.addEventListener('mousemove', mouseMoveV);
        window.addEventListener('mouseup', mouseUpV);

    });

    // when event is hovered, calculate and show the octave relations to every other note
    $noteBody.addEventListener('mouseenter', (e) => {
        e.stopPropagation();
        recalcRelations();
    });
    $noteBody.addEventListener('mouseleave', (e) => {
        e.stopPropagation();
        toneRelations.value = [];
    });

});

</script>

<template>
    <text :x="noteRect.x" :y="noteRect.y + 9" font-size="10">{{ noteRect.note.octave }} Octs.</text>
    <text :x="noteRect.x" :y="noteRect.y + 23" font-size="10">{{ noteRect.note.frequency }} Hz.</text>
    <rect class="body" ref="noteBody" :x="noteRect.x" :y="noteRect.y" :width="noteRect.w" height="10" />
    <rect class="rightEdge" ref="rightEdge" :x="noteRect.x + noteRect.w - 5" :y="noteRect.y" width="5" :height="10" />
    <template v-for="relation in toneRelations">
        <line class="relation" :x1="relation.xPosition" :y1="noteRect.y" :x2="relation.xPosition"
            :y2="noteRect.y + relation.distancePx" />
        <text :x="relation.xPosition + 5" :y="5 + noteRect.y + relation.distancePx / 2" font-size="10">
            {{ relation.text }}
        </text>
    </template>
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

.relation {
    stroke: #999;
    stroke-width: 1;
    stroke-dasharray: 5;
}
</style>
