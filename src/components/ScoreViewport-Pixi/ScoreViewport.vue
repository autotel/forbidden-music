<script setup lang="ts">
import { Tool } from '../../dataTypes/Tool';
import { usePlaybackStore } from '../../store/playbackStore';
import { useProjectStore } from '../../store/projectStore';
import { useToolStore } from '../../store/toolStore';
import { useViewStore } from '../../store/viewStore';
import { onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';
import * as PIXI from 'pixi.js';
import { SelectableType } from '../../dataTypes/TimelineItem';
import { EditNote } from '../../dataTypes/EditNote';
import { useMonoModeInteraction } from '../../store/monoModeInteraction';
import { useGridsStore } from '../../store/gridsStore';
import { useSelectStore } from '../../store/selectStore';
import { useSnapStore } from '../../store/snapStore';
import { text } from 'stream/consumers';

const project = useProjectStore();
const tool = useToolStore();
const playback = usePlaybackStore();
const view = useViewStore();
const canvasContainer = ref<HTMLDivElement>();
const mainInteraction = useMonoModeInteraction().getInteractionModal("default");
const gridsStore = useGridsStore();
const selection = useSelectStore();
const rightEdgeWidth = 10;
const snap = useSnapStore();

const pixiApp = new PIXI.Application({
    background: '#fff',
    resizeTo: window,
    antialias: true,
});


const props = defineProps<{
    width: number,
    height: number,
}>();

let noteBeingRightEdgeHovered: EditNote | null = null;

const mouseMoveListener = (e: MouseEvent) => {
    const stuffAtCoordinates = view.everyNoteRectAtCoordinates(e.offsetX, e.offsetY, tool.current === Tool.Modulation);
    const firstThing = stuffAtCoordinates[0];
    // couold be a bit more elegant
    if (firstThing) {
        const isRightEdge = firstThing.rightEdge ? (e.offsetX > firstThing.rightEdge?.x - rightEdgeWidth) : false;
        if (isRightEdge) {
            if (noteBeingRightEdgeHovered !== firstThing.event) {
                tool.noteRightEdgeMouseEnter(firstThing.event as EditNote);
                noteBeingRightEdgeHovered = firstThing.event as EditNote;
            }
        } else if (noteBeingRightEdgeHovered) {
            tool.noteRightEdgeMouseLeave();
            noteBeingRightEdgeHovered = null;
            tool.noteMouseEnter(firstThing.event as EditNote);
        } else {
            tool.noteMouseEnter(firstThing.event as EditNote);
        }
    } else if (!firstThing && tool.noteBeingHovered) {
        tool.noteMouseLeave();
        if (noteBeingRightEdgeHovered) {
            tool.noteRightEdgeMouseLeave();
            noteBeingRightEdgeHovered = null;
        }
    }
}


const start = () => {
    if (requestedAnimationFrame.value) {
        cancelAnimationFrame(requestedAnimationFrame.value);
    }
    const frame = () => {
        refreshView();
        requestedAnimationFrame.value = requestAnimationFrame(frame);
    };
    requestedAnimationFrame.value = requestAnimationFrame(frame);
}
const stop = () => {
    if (requestedAnimationFrame.value) {
        cancelAnimationFrame(requestedAnimationFrame.value);
    }
    requestedAnimationFrame.value = 0;
}


let graphics = new PIXI.Graphics();

onMounted(() => {
    start();
    if (!canvasContainer.value) throw new Error("canvas container not found");
    mainInteraction.addEventListener(canvasContainer.value, "mousemove", mouseMoveListener);
    canvasContainer.value.appendChild(pixiApp.view as unknown as HTMLElement);
    pixiApp.stage.addChild(graphics);

})

onBeforeUnmount(() => {
    const $viewPort = canvasContainer.value;
    if (!$viewPort) throw new Error("canvas not found");
    stop();
});

const texts: PIXI.Text[]= [];

const refreshView = () => {

    const visibleNotes = [
        ...view.visibleNoteRects,
        ...tool.notesBeingCreated.map(view.rectOfNote),
    ];
    if (tool.noteThatWouldBeCreated) visibleNotes.push(
        view.rectOfNote(tool.noteThatWouldBeCreated)
    );


    const playbackPxPosition = playback.playbarPxPosition;
    graphics.clear();
    // draw playbar

    const path = [
        playbackPxPosition, 0,
        playbackPxPosition, props.height
    ];

    graphics.lineStyle(3, 0x000000, 1);
    graphics.drawPolygon(path);
    graphics.endFill();

    // could redraw lines only on view change, perhaps on an overlayed canvas
    // draw grid lines
    graphics.lineStyle(1, 0xCCCCCC, 0.5);
    const { linePositionsPx, linePositionsPy } = gridsStore;
    for (const linePositionPx of linePositionsPx) {
        graphics.moveTo(linePositionPx, 0);
        graphics.lineTo(linePositionPx, props.height);
    }
    for (const linePositionPy of linePositionsPy) {
        graphics.moveTo(0, linePositionPy);
        graphics.lineTo(props.width, linePositionPy);
    }


    // snap explanations
    let textToUse = 0;
    const snapFocusedNoteRect = snap.focusedNote ? view.rectOfNote(
        snap.focusedNote
    ) : null;
    if (snapFocusedNoteRect) {
        graphics.lineStyle(1, 0xCCCCCC, 0.5);
        textToUse = 0;
        for (const snapExplanation of snap.toneSnapExplanation) {
            const relatedNoteRect = snapExplanation.relatedNote ? view.rectOfNote(
                snapExplanation.relatedNote
            ) : null;
            if (relatedNoteRect) {
                graphics.moveTo(snapFocusedNoteRect.cx, snapFocusedNoteRect.cy);
                graphics.lineTo(relatedNoteRect.cx, relatedNoteRect.cy);
                graphics.beginFill(0x000000, 1);
                graphics.drawCircle(relatedNoteRect.cx, relatedNoteRect.cy, 3);
                graphics.endFill();
                graphics.beginFill(0x000000, 1);
                let text = null;
                if(!texts[textToUse]){
                    texts[textToUse] = new PIXI.Text('',{
                        fontSize: 18,
                        fill: 0x000000,
                    });
                    pixiApp.stage.addChild(texts[textToUse]);
                    text = texts[textToUse];
                    textToUse++;
                }else{
                    text = texts[textToUse];
                    textToUse++;
                }
                if(!text) throw new Error("failed to instantiate text");
                text.text = snapExplanation.text;
                text.x = relatedNoteRect.cx + 5;
                text.y = relatedNoteRect.cy + 5;
            }
        }
        // hide all the unused texts
        for(let i = textToUse; i < texts.length; i++){
            texts[i].text = "";
        }

    }




    // draw notes & velolines if 
    graphics.lineStyle(1, 0xAAAAAA, 0.5);
    for (const note of visibleNotes) {
        if (note.event.selected) {
            graphics.beginFill(0xFCCCCC, 0.6);
        } else {
            graphics.beginFill(0xDDDDDD, 1);
        }
        if (note.width) {
            // ctx.fillRect(note.x, note.y, note.width, note.height);
            graphics.drawRect(note.x, note.y, note.width, note.height);
        } else {
            // ctx.arc(note.cx, note.cy, note.radius, 0, 2 * Math.PI);
            graphics.drawCircle(note.cx, note.cy, note.radius);
        }
        if (tool.current === Tool.Modulation) {
            const veloLinePositionY = view.velocityToPxWithOffset(note.event.velocity);
            graphics.lineStyle(2, 0x000000, 2);
            graphics.moveTo(note.x, veloLinePositionY + 7);
            graphics.lineTo(note.x, view.viewHeightPx);
            graphics.drawCircle(note.cx, veloLinePositionY, note.radius);
        }
        graphics.endFill();
    }

    if (tool.selectRange.active) {
        const selRange = view.pxRectOf(tool.selectRange);
        // ctx.fillRect(selRange.x, selRange.y, selRange.width, selRange.height);
        graphics.beginFill(0x000044, 0.5);
        graphics.lineStyle(1, 0xDDDDDD, 0.1);
        graphics.drawRect(selRange.x, selRange.y, selRange.width, selRange.height);
        graphics.endFill();
    }
}

const requestedAnimationFrame = ref<number>(0);


</script>
<template>
    <div ref="canvasContainer" :width="view.viewWidthPx" :height="view.viewHeightPx" :class="tool.cursor">
    </div>
</template>