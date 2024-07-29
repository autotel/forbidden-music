<script setup lang="ts">
import { getDuration } from '@/dataTypes/TimelineItem';
import { frequencyToOctave } from '@/functions/toneConverters';
import { AnalyzedCallback, useFtCaptureStore } from '@/store/ftCaptureStore';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { usePlaybackStore } from '../store/playbackStore';
import { useViewStore } from '../store/viewStore';

const view = useViewStore();
const playback = usePlaybackStore();
const ftCapture = useFtCaptureStore();
const pathD = ref('M 10 10 L 100 100');


interface Text {
    x: number;
    y: number;
    text: string;
}

const texts = ref<Text[]>([
    { x: 10, y: 20, text: 'Ft' }
]);

const filterText = computed(() => {
    // x = currentXPos + 100;
    const octave = ftCapture.audioParams.filterFreqParam.octaveValue;
    const displayValue = ftCapture.audioParams.filterFreqParam.displayValue;
    // texts.value[textCount].y = view.octaveToPxWithOffset(octave);
    // texts.value[textCount].text = `FILTER FQ = ${displayValue}`;
    // textCount++;
    return {
        x: view.timeToPxWithOffset(playback.currentScoreTime),
        t: view.octaveToPxWithOffset(octave),
        text: `FILTER FQ = ${displayValue}`
    }
});

const updateFtPath: AnalyzedCallback = ({ filteredData }) => {
    const {
        octaveToFtBin, ftBinToFreq,
        minBin, maxBin, capturedTones,
    } = ftCapture;
    
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
        const y2 = px;
        const x2 = currentXPos + filteredData[binNo];
        if (isNaN(x2) || isNaN(y2)) continue;

        path += ` ${c ? 'L' : 'M'} ${x2} ${y2}`;

        c++;
    }

    pathD.value = path;

    if (ftCapture.showText) {
        texts.value = [];
        for (let peak of ftCapture.topPeaksTracker.peaks) {
            if (!peak.keep) continue;
            if (!texts.value[textCount]) texts.value[textCount] = { x: 0, y: 0, text: '' };
            texts.value[textCount].x = currentXPos + (filteredData[Math.floor(peak.bin)] ?? 0);
            const frequency = ftBinToFreq(peak.bin);
            const octave = frequencyToOctave(frequency);
            texts.value[textCount].y = view.octaveToPxWithOffset(octave);
            texts.value[textCount].text = `${octave.toFixed(1)} = hz ${frequency.toFixed(2)} bin ${peak.bin.toFixed(2)}`;
            textCount++;
        }

    }

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
        <template v-if="ftCapture.showText" v-for="t in texts" :key="t.text">
            <line :x1="t.x - 10" :y1="t.y" :x2="t.x + 10" :y2="t.y" stroke="black" />
            <text :x="t.x + 15" :y="t.y" :font-size="ctoneRectHeight * 2" opacity="0.5" dominant-baseline="middle">{{
                t.text }}</text>
            
        </template>
        <text v-if="ftCapture.showText"
            :x="filterText.x - 10" :y="filterText.t" 
            :font-size="ctoneRectHeight * 2" 
            opacity="0.5" 
            dominant-baseline="middle"
            text-anchor="end"
        >
            {{ filterText.text }}
        </text>
        <path :d="pathD" fill="none" :class="ftCapture.recordToNotes ? 'rec' : 'scope'" stroke-width="2" />

        <template v-for="[k, capturedTone] in ftCapture.capturedTones">
            <rect :x="view.timeToPxWithOffset(capturedTone.time)" :width="view.timeToPx(getDuration(capturedTone))"
                :y="view.octaveToPxWithOffset(capturedTone.octave) - ctoneRectHalfHeight" :height="ctoneRectHeight" />

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

#magic-ft text{
    fill:currentColor;
}
#magic-ft * {
    pointer-events: none;
}

path.rec {
    stroke: rgb(255, 0, 106);
}

path.scope {
    stroke: rgba(135, 227, 255, 1)
}

#magic-ft rect {
    fill: rgba(135, 227, 255, 0.2)
}
</style>
