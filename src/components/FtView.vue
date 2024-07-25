<script setup lang="ts">
import { note } from '@/dataTypes/Note';
import { getDuration } from '@/dataTypes/TimelineItem';
import { frequencyToOctave, octaveToFrequency } from '@/functions/toneConverters';
import { useAudioCaptureStore } from '@/store/audioCaptureStore';
import { AnalyzedCallback, CapturedTone, useFtCaptureStore } from '@/store/ftCaptureStore';
import { useToolStore } from '@/store/toolStore';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { usePlaybackStore } from '../store/playbackStore';
import { useViewStore } from '../store/viewStore';

const view = useViewStore();
const playback = usePlaybackStore();
const audioCaptureStore = useAudioCaptureStore();
await audioCaptureStore.requestAudioCapture();
const tool = useToolStore();
const ftCapture = useFtCaptureStore();
const pathD = ref('M 10 10 L 100 100');

const debugValues = false;

interface Text {
    x: number;
    y: number;
    text: string;
}

const texts = ref<Text[]>([
    { x: 10, y: 20, text: 'Ft' }
]);


const capturedToneMouseEnter = (e: MouseEvent, captured: CapturedTone) => {
    const nNote = note(captured);
    // project.notes.push(nNote);
    tool.noteThatWouldBeCreated = nNote;
    // capturedTones.value.delete(captured.identifier);

}


const updateFtPath: AnalyzedCallback = ({ filteredData }) => {
    const {
        analyser,
        dataArray,
        octaveToFtBin, ftBinToFreq, pxToFtBin,
        minBin, maxBin,
        topPeaksTracker, capturedTones,
    } = ftCapture;
    // console.log('updating ft path');
    const currentXPos = view.timeToPxWithOffset(playback.currentScoreTime);

    const octaveEdges = [
        view.viewHeightOctaves - view.octaveOffset,
        - view.octaveOffset
    ].sort((a, b) => a - b);
    const octaveRange = octaveEdges[1] - octaveEdges[0];

    const binStart = Math.max(
        octaveToFtBin(octaveEdges[0]).binNo,
        minBin
    );
    const binEnd = Math.min(
        octaveToFtBin(octaveEdges[1]).binNo,
        maxBin
    );


    let c = 0;
    let textCount = 0;
    let path = '';
    texts.value = [];

    for (let binNo = binStart; binNo < binEnd; binNo += 1) {
        if (binNo < 1) continue;
        const octave = frequencyToOctave(ftBinToFreq(binNo));
        const px = view.octaveToPxWithOffset(octave)
        const y = px;
        const y2 = px;
        const x2 = currentXPos + filteredData[binNo];
        if (isNaN(x2) || isNaN(y2)) continue;

        path += ` ${c ? 'L' : 'M'} ${x2} ${y2}`;

        if (debugValues) {
            if (!texts.value[textCount]) texts.value[textCount] = { x: 0, y: 0, text: '' };
            texts.value[textCount].x = currentXPos;
            texts.value[textCount].y = y;
            texts.value[textCount].text = `0${octave.toFixed(1)} = hz ${octaveToFrequency(octave).toFixed(2)} bin ${binNo}`;
            textCount++;
        }
        c++;
    }

    for (let [key, capTone] of capturedTones) {
        const octave = capTone.octave;
        const y = view.octaveToPxWithOffset(octave);
        if (isNaN(y)) continue;
        if (!texts.value[textCount]) texts.value[textCount] = { x: 0, y: 0, text: '' };
        texts.value[textCount].x = currentXPos;
        texts.value[textCount].y = y;
        texts.value[textCount].text = `[${capTone.identifier}] ${octave.toFixed(2)}}`;
        textCount++;

    }

    pathD.value = path;

}



onMounted(() => {
    ftCapture.addAnalyzedCallback(updateFtPath);
    ftCapture.activate();
});

onBeforeUnmount(() => {
    ftCapture.removeAnalyzedCallback(updateFtPath);
    ftCapture.deactivate();
})


const ctoneRectHeight = 7;
const ctoneRectHalfHeight = ctoneRectHeight / 2;
</script>

<template>
    <svg id="magic-ft">
        <template v-for="t in texts" :key="t.text">
            <line :x1="t.x" :y1="t.y" :x2="t.x + 10" :y2="t.y" stroke="black" />
            <text :x="t.x" :y="t.y" font-size="14">{{ t.text }}</text>
        </template>

        <path :d="pathD" fill="none" stroke="red" stroke-width="2" />

        <template v-for="[k, capturedTone] in ftCapture.capturedTones">
            <rect class="clickable" :x="view.timeToPxWithOffset(capturedTone.time)"
                :width="view.timeToPx(getDuration(capturedTone))"
                :y="view.octaveToPxWithOffset(capturedTone.octave) - ctoneRectHalfHeight" :height="ctoneRectHeight"
                @mousemove="(e) => capturedToneMouseEnter(e, capturedTone)" />
            />
            <!-- <text :x="view.timeToPxWithOffset(capturedTone.time)" :y="view.octaveToPxWithOffset(capturedTone.octave)"
                font-size="14">{{ k }}</text> -->
        </template>

    </svg>
</template>
<style scoped>
#magic-ft {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.clickable {
    fill: rgba(0, 0, 0, 0.5);
    pointer-events: all;
    cursor: pointer;
    z-index: 10;
}
</style>
