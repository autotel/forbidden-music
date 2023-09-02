<script setup lang="ts">
import * as PIXI from 'pixi.js';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Trace } from '../../dataTypes/Trace';
import { Tool } from '../../dataTypes/Tool';
import { useCustomSettingsStore } from '../../store/customSettingsStore';
import { useGridsStore } from '../../store/gridsStore';
import { useMonoModeInteraction } from '../../store/monoModeInteraction';
import { usePlaybackStore } from '../../store/playbackStore';
import { useSnapStore } from '../../store/snapStore';
import { useToolStore } from '../../store/toolStore';
import { layerNoteColors, useViewStore, TimelineItemRect } from '../../store/viewStore';
import { baseFrequency } from '../../functions/toneConverters';
import { TimelineItem } from '../../dataTypes/TimelineItem';

const tool = useToolStore();
const playback = usePlaybackStore();
const view = useViewStore();
const canvasContainer = ref<HTMLDivElement>();
const mainInteraction = useMonoModeInteraction().getInteractionModal("default");
const gridsStore = useGridsStore();
const rightEdgeWidth = 10;
const snap = useSnapStore();
const userSettings = useCustomSettingsStore();
const measureSteps = 0;

const pixiApp = new PIXI.Application({
    background: '#fff',
    resizeTo: window,
    antialias: true,
});


const props = defineProps<{
    width: number,
    height: number,
}>();

let thingBeingHovered: TimelineItemRect | null = null;
let isHoverRightEdge = false;

const didHoverChange = (hoveredThing: TimelineItemRect | null, isRightEdge: boolean) => {
    if(hoveredThing === thingBeingHovered && isRightEdge === isHoverRightEdge) return false;
    return true;
}
const hoverChanged = (hoveredThing: TimelineItemRect | null, isRightEdge: boolean) => {
    thingBeingHovered = hoveredThing;
    isHoverRightEdge = isRightEdge;
}

const mouseMoveListener = (e: MouseEvent) => {
    const notesAtCoords = view.everyNoteAtCoordinates(
        e.offsetX,
        e.offsetY,
        tool.current === Tool.Modulation
    );

    const otherItemsAtCoords = view.everyOtherItemAtCoordinates(
        e.offsetX,
        e.offsetY
    );

    const firstNoteRect = notesAtCoords[0] || null;
    const firstItemRect = otherItemsAtCoords[0] || null;

    const hoveredThing = firstNoteRect || firstItemRect || null;
    const isRightEdge =  hoveredThing.rightEdge ? (
            (e.offsetX > hoveredThing.rightEdge?.x - rightEdgeWidth)
        ) : false;

    if(didHoverChange(hoveredThing, isRightEdge)){
        if(firstNoteRect){
            if(isRightEdge){
                tool.noteRightEdgeMouseEnter(firstNoteRect.event as Trace);
            }else{
                tool.noteRightEdgeMouseLeave();
                tool.noteMouseEnter(firstNoteRect.event as Trace);
            }
        }else if(firstItemRect){
            if(isRightEdge){
                tool.timelineItemRightEdgeMouseEnter(firstItemRect.event);
            }else{
                tool.timelineItemRightEdgeMouseLeave();
                tool.timelineItemMouseEnter(firstItemRect.event);
            }
        }else{
            tool.timelineItemMouseLeave();
            tool.timelineItemRightEdgeMouseLeave();
            tool.noteMouseLeave();
            tool.noteRightEdgeMouseLeave();
        }
    }
    hoverChanged(hoveredThing, isRightEdge);

}

let deltaTime = 0;
let frameStartTime = 0;
let fpsString = "";
let avgFps = 0;
const start = () => {
    if (requestedAnimationFrame.value) {
        cancelAnimationFrame(requestedAnimationFrame.value);
    }
    let prevTime = performance.now();
    const frame = (time: number) => {
        requestedAnimationFrame.value = requestAnimationFrame(frame);
        if (userSettings.showFPS) {
            deltaTime = time - prevTime;
            frameStartTime = performance.now();
        }
        refreshView(time);
        if (userSettings.showFPS) {
            const endTime = performance.now();
            prevTime = time;
            const fps = 1000 / deltaTime;
            const fpsCapacity = 1000 / (endTime - frameStartTime);
            if (!avgFps) avgFps = fps;
            avgFps = avgFps * 0.9 + fps * 0.1;
            fpsString = `fps: ${fps.toFixed(2)}\n avg:${avgFps}\n fpsCapacity: ${fpsCapacity.toFixed(2)}`;
        }

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

const texts: PIXI.Text[] = [];

let currentTaskName = "";
let startTime = performance.now();
let previousTime = startTime;
const stepsToLog: { taskName: string, time: number }[] = [];
const taskMark = (taskName: string) => {
    const now = performance.now();
    stepsToLog.push({
        taskName,
        time: now - previousTime,
    });
    previousTime = performance.now();
}

let textToUse = 0;
const getText = (): PIXI.Text => {
    let retValue: PIXI.Text | null = null;
    if (!texts[textToUse]) {
        texts[textToUse] = new PIXI.Text();
        pixiApp.stage.addChild(texts[textToUse]);
    }
    retValue = texts[textToUse];
    retValue.style.fontSize = userSettings.fontSize;
    textToUse++;
    if (textToUse > 1000) throw new Error("too many texts. Are you calling resetGetText?");
    return retValue;
}
const resetGetText = () => {
    // hide all the unused texts
    for (let i = textToUse; i < texts.length; i++) {
        texts[i].text = "";
    }
    textToUse = 0;
}

const refreshView = (time: number) => {

    if (measureSteps) taskMark("1. gather facts")
    const visibleNotes = [
        ...view.visibleNoteRects,
        ...tool.notesBeingCreated.map(view.rectOfNote),
    ];
    if (tool.noteThatWouldBeCreated) visibleNotes.push(
        view.rectOfNote(tool.noteThatWouldBeCreated)
    );

    const playbackPxPosition = playback.playbarPxPosition;
    if (measureSteps) taskMark("2. clear canvas");
    graphics.clear();





    if (measureSteps) taskMark("3. draw playbar");
    // draw playbar
    const path = [
        playbackPxPosition, 0,
        playbackPxPosition, props.height
    ];

    graphics.lineStyle(3, 0x000000, 1);
    graphics.drawPolygon(path);
    graphics.endFill();

    // draw loop range
    // if (playback.loop) {
    //     const loopRect = view.rectOfTimelineItem(playback.loop);
    //     graphics.beginFill(0x000000, 0.1);
    //     graphics.lineStyle(1, 0x000000, 1);
    //     graphics.drawRect(loopRect.x, loopRect.y, loopRect.width, loopRect.height);
    //     graphics.endFill();
    // }

    const otherItemRects = view.visibleOtherItemRects;
    otherItemRects.forEach((rect) => {
        graphics.beginFill(0x000000, 0.1);
        graphics.lineStyle(1, 0x000000, 1);
        graphics.drawRect(rect.x, rect.y, rect.width, rect.height);
        graphics.endFill();

    });



    // could redraw lines only on view change, perhaps on an overlayed canvas
    if (measureSteps) taskMark("4. draw grids");
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
    // draw grid line labels
    graphics.beginFill(0x000000, 1);
    const fallbackX = 5;
    const fallbackY = 5;
    for (const label of gridsStore.lineLabels) {
        let { x, y, text } = label;
        if (x === null) x = fallbackX;
        if (y === null) y = fallbackY;
        const textSprite = getText();
        textSprite.text = text;
        textSprite.x = x;
        textSprite.y = y;
    }
    graphics.endFill();

    if (measureSteps) taskMark("5. draw snapexpl");
    const relationcolor = 0x7525dd;

    // draw snap explanations
    let snapExplTextsStart = textToUse - 1;
    const snapFocusedItemRect = snap.focusedTrace ? view.rectOfNote(
        snap.focusedTrace
    ) : null;
    if (snapFocusedItemRect) {
        graphics.lineStyle(1, relationcolor, 0.5);
        for (const snapExplanation of snap.toneSnapExplanation) {
            const relatedItemRect = snapExplanation.relatedNote ? view.rectOfNote(
                snapExplanation.relatedNote
            ) : snapFocusedItemRect;
            if (relatedItemRect) {
                const middleY =
                    snapFocusedItemRect.cy == relatedItemRect.cy ?
                        snapFocusedItemRect.cy :
                        (snapFocusedItemRect.cy + relatedItemRect.cy) / 2;

                const leftX = Math.max(relatedItemRect.cx, 5);
                graphics.moveTo(leftX, relatedItemRect.cy);
                graphics.lineTo(leftX, snapFocusedItemRect.cy);
                graphics.lineTo(snapFocusedItemRect.cx, snapFocusedItemRect.cy);
                graphics.beginFill(relationcolor, 1);
                graphics.drawCircle(leftX, relatedItemRect.cy, 3);
                graphics.endFill();
                graphics.beginFill(relationcolor, 1);
                let text = getText();
                text.text = snapExplanation.text;
                text.x = leftX + 5;
                text.y = middleY - 9;
                graphics.endFill();
            }
        }
        // prevent texts overlapping 
        for (let i = snapExplTextsStart; i < textToUse; i++) {
            for (let j = i + 1; j < texts.length; j++) {
                if (texts[i].y === texts[j].y) {
                    texts[j].y += 20;
                }
            }
        }

    }

    const displayTexts = view.viewWidthTime < 3;

    if (measureSteps) taskMark("6. draw notes");
    for (const nRect of visibleNotes) {
        const lcolor = layerNoteColors[nRect.event.layer];
        if (nRect.event.selected) {
            graphics.beginFill(lcolor, 1);
            graphics.lineStyle(1, 0x555555, 0.9);
        } else if (nRect.event.mute) {
            graphics.beginFill(lcolor, 0.15);
            graphics.lineStyle(1, 0x333333, 0.15);
        } else {
            graphics.beginFill(lcolor, 0.5);
            graphics.lineStyle(1, 0xAAAAAA, 0.5);
        }
        if (nRect.width) {
            // ctx.fillRect(nRect.x, nRect.y, nRect.width, nRect.height);
            graphics.drawRect(nRect.x, nRect.y, nRect.width, nRect.height);
        } else {
            // ctx.arc(nRect.cx, nRect.cy, nRect.radius, 0, 2 * Math.PI);
            graphics.drawCircle(nRect.cx, nRect.cy, nRect.radius);
        }
        if (displayTexts) {
            let text = getText();
            text.text = `${baseFrequency}(2^${nRect.event.octave.toFixed(3)}) = ${nRect.event.frequency.toFixed(3)} hz`;
            text.x = nRect.x + 5;
            text.y = nRect.y + nRect.radius - userSettings.fontSize / 2;
            text.style.fontSize = userSettings.fontSize;
        }

        if (tool.current === Tool.Modulation) {
            const veloLinePositionY = view.velocityToPxWithOffset(nRect.event.velocity);
            graphics.lineStyle(2, 0x000000, 2);
            graphics.moveTo(nRect.x, veloLinePositionY + 7);
            graphics.lineTo(nRect.x, view.viewHeightPx);
            graphics.drawCircle(nRect.cx, veloLinePositionY, nRect.radius);
        }
        graphics.endFill();
    }

    if (measureSteps) taskMark("7. draw selection");

    // draw select range
    if (tool.selectRange.active) {
        const selRange = view.rangeToStrictRect(tool.selectRange);
        // ctx.fillRect(selRange.x, selRange.y, selRange.width, selRange.height);
        graphics.beginFill(0xffffff, 0.1);
        graphics.lineStyle(1, 0x555555, 1);
        graphics.drawRect(selRange.x, selRange.y, selRange.width, selRange.height);
        graphics.endFill();
    }
    if (userSettings.showFPS) {
        let text = getText();
        text.text = fpsString;
        text.x = 5;
        text.y = 5;
        graphics.endFill();
    } else if (measureSteps) {
        // draw task timings text
        stepsToLog.sort((a, b) => b.time - a.time);
        const totalTime = performance.now() - startTime;
        const log = `${totalTime} \n${stepsToLog.map(step => `${step.taskName}: ${step.time.toFixed(2)}ms`).join("\n")}`;
        // console.log(log);
        {
            let text = getText();
            text.text = log;
            text.x = 5;
            text.y = 5;
            graphics.endFill();
        }
        stepsToLog.length = 0
    };

    resetGetText();
}

const requestedAnimationFrame = ref<number>(0);


</script>
<template>
    <div ref="canvasContainer" :style="{
        width: view.viewWidthPx + 'px',
        height: view.viewHeightPx + 'px',
        overflow: 'hidden',
    }" :class="tool.cursor">
    </div>
</template>

<style scoped>
.cursor-draw {
    cursor: url("../../assets/icons-iconarchive-pen.png") 3 3, crosshair;
}

.cursor-move {
    cursor: move;
}

.cursor-grab {
    cursor: grab;
}

.cursor-grabbing {
    cursor: grabbing;
}
</style>