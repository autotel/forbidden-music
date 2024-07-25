<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';
import { usePlaybackStore } from '../store/playbackStore';
import { useViewStore } from '../store/viewStore';
import Button from './Button.vue';
import { useAudioContextStore } from '@/store/audioContextStore';
import { useAudioCaptureStore } from '@/store/audioCaptureStore';
import { baseFrequency, frequencyToOctave, octaveToFrequency } from '@/functions/toneConverters';
import { text } from 'stream/consumers';
import { useMasterEffectsStore } from '@/store/masterEffectsStore';
import { time } from 'console';
import { OctavePosition, TimeRange, getDuration } from '@/dataTypes/TimelineItem';
import { note } from '@/dataTypes/Note';
import { useProjectStore } from '@/store/projectStore';
import { useToolStore } from '@/store/toolStore';
import SvgLittleButton from './ScoreViewport-Svg/SvgLittleButton.vue';

const view = useViewStore();
const playback = usePlaybackStore();
const masterFx = useMasterEffectsStore();
const audioContextStore = useAudioContextStore();
const audioCaptureStore = useAudioCaptureStore();
const project = useProjectStore();
await audioCaptureStore.requestAudioCapture();
const tool = useToolStore();
const active = ref(false);

type CapturedTone = OctavePosition & TimeRange & { identifier: number };
const pathD = ref('M 10 10 L 100 100');

const capturedTones = ref<Map<number, CapturedTone>>(new Map());
const deleteCapturedTonesAtTime = (time: number, exceptIds: number[]) => {
    for (let [key, value] of capturedTones.value) {
        if (isNaN(value.timeEnd) || isNaN(value.time) || isNaN(value.octave)) {
            capturedTones.value.delete(key);
            continue;
        }
        if (exceptIds.includes(key)) continue;
        if (value.time <= time && value.timeEnd >= time) {
            capturedTones.value.delete(key);
        }
    }
}

const flushCapturedTones = () => {
    for (let [key, value] of capturedTones.value) {
        if (isNaN(value.timeEnd) || isNaN(value.time) || isNaN(value.octave)) {
            capturedTones.value.delete(key);
            continue;
        }
        if (value.timeEnd < playback.currentScoreTime) {
            if(getDuration(value) > 0.3) {
                convertToNote(value);
            }
        }
    }
}


const debugValues = false;

interface Text {
    x: number;
    y: number;
    text: string;
}

const texts = ref<Text[]>([
    { x: 10, y: 20, text: 'Ft' }
]);

const analyser = audioContextStore.audioContext.createAnalyser();
analyser.fftSize = 1024;
const ftFrequency = audioContextStore.audioContext.sampleRate / analyser.fftSize;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Float32Array(bufferLength);

interface TrackedPeak {
    bin: number;
    keep: number;
    identifier: number;
}

const topPeaksTracker = (() => {
    const peaks = [] as TrackedPeak[];
    const binChangeTolerance = 1;
    let peakIdCount = 0;

    const findOrCreatePeak = (bin: number) => {
        let found = peaks.find(p => p.keep && Math.abs(p.bin - bin) < binChangeTolerance);
        if (found) return found;
        let recycled = peaks.find(p => !p.keep);
        if (recycled) {
            recycled.identifier = peakIdCount++;
            return recycled;
        }
        let newPeak = {
            identifier: peakIdCount++,
            prevFrequncy: 0,
            frequency: 0,
            bin: 0,
            keep: 0
        }
        peaks.push(newPeak);
        return newPeak;
    }

    const analyzeFt = (data: number[]) => {
        let prevSlope = 0;
        let prevBinValue = 0;

        const minBin = freqToFtBin(200);
        const maxBin = freqToFtBin(2500);
        
        peaks.map(p => {
            if (p.keep) p.keep--;
        });

        const dataMax = Math.max(...data);
        const threshold = dataMax * 0.7;

        for (let i = minBin; i < maxBin; i++) {
            if (data[i] < threshold) continue;

            const slope = data[i] - prevBinValue;


            if (slope < 0 && prevSlope > 0) {
                const around = 4;
                const levelsAround = data.slice(i - around, i + around);

                let weightedAverageBin = 0;
                for (let j = 0; j < levelsAround.length; j++) {
                    weightedAverageBin += levelsAround[j] * (i - around + j);
                }
                weightedAverageBin /= levelsAround.reduce((a, b) => a + b, 0);

                const peak = findOrCreatePeak(weightedAverageBin);
                peak.bin = weightedAverageBin;
                peak.keep = 4;
            }

            prevSlope = slope;
            prevBinValue = data[i];
        }
    }

    return {
        analyzeFt,
        peaks
    }
})();

const freqToFtBin = (freq: number) => {
    const binNo = freq / ftFrequency;
    return Math.round(binNo);
}
const ftBinToFreq = (binNo: number) => {
    return binNo * ftFrequency;
}

const pxToFtBin = (px: number) => {
    const freq = octaveToFrequency(
        view.pxToOctaveWithOffset(px)
    );
    const binNo = freqToFtBin(freq);
    return { binNo, freq };
}

const octaveToFtBin = (octave: number) => {
    const octaveFreq = octaveToFrequency(octave);
    const binNo = freqToFtBin(octaveFreq);
    return { binNo, freq: octaveFreq };
}

let currentScheduledUpdate = false as any;
const convertToNote = (captured: CapturedTone) => {
    const nNote = note(captured);
    nNote.layer = tool.currentLayerNumber;
    project.notes.push(nNote);
    capturedTones.value.delete(captured.identifier);
}
const capturedToneMouseEnter = (e: MouseEvent, captured: CapturedTone) => {
    const nNote = note(captured);
    // project.notes.push(nNote);
    tool.noteThatWouldBeCreated = nNote;
    // capturedTones.value.delete(captured.identifier);

}
const updateFtPath = () => {
    // console.log('updating ft path');
    const currentXPos = view.timeToPxWithOffset(playback.currentScoreTime);

    const octaveEdges = [
        view.viewHeightOctaves - view.octaveOffset,
        - view.octaveOffset
    ].sort((a, b) => a - b);
    const octaveRange = octaveEdges[1] - octaveEdges[0];

    const binStart = octaveToFtBin(octaveEdges[0]).binNo;
    const binEnd = octaveToFtBin(octaveEdges[1]).binNo;

    analyser.getFloatFrequencyData(dataArray);


    let c = 0;
    let textCount = 0;
    let path = '';
    texts.value = [];


    let runningAverage = dataArray[0];
    const hpk = 0.94;
    const ihpk = 1 - hpk;
    

    const highPassedData: number[] = [...dataArray].map(d => {
        runningAverage = runningAverage * hpk + d * ihpk;
        return d - runningAverage;
    });

    // const dataToUse = highPassedData;
    const dataToUse = dataArray;

    for (let binNo = binStart; binNo < binEnd; binNo += 1) {
        if (binNo < 1) continue;
        if (!dataToUse[binNo]) continue;
        const octave = frequencyToOctave(ftBinToFreq(binNo));
        const px = view.octaveToPxWithOffset(octave)
        const y = px;

        const y2 = px;
        const x2 = currentXPos + dataToUse[binNo];
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

    topPeaksTracker.analyzeFt([...dataToUse]);

    let keepTones = new Set<number>();
    for (let peak of topPeaksTracker.peaks) {
        if (!peak.keep) continue;
        const frequency = ftBinToFreq(peak.bin);
        const octave = frequencyToOctave(frequency);
        const y = view.octaveToPxWithOffset(octave);

        const existing = capturedTones.value.get(peak.identifier);
        if (existing) {
            existing.timeEnd = playback.currentScoreTime;
            continue;
        } else {
            capturedTones.value.set(peak.identifier, {
                time: playback.currentScoreTime,
                timeEnd: playback.currentScoreTime + 0.1,
                octave,
                identifier: peak.identifier
            });
        }
        if (isNaN(y)) continue;
        keepTones.add(peak.identifier);
        if (!texts.value[textCount]) texts.value[textCount] = { x: 0, y: 0, text: '' };
        texts.value[textCount].x = currentXPos;
        texts.value[textCount].y = y;
        texts.value[textCount].text = `[${peak.identifier}] ${octave.toFixed(2)} = hz ${frequency.toFixed(2)}`;
        textCount++;

    }


    // deleteCapturedTonesAtTime(playback.currentScoreTime + 0.01, Array.from(keepTones));
    flushCapturedTones();
    // console.log(topPeaksTracker.peaks);

    pathD.value = path;

    currentScheduledUpdate = requestAnimationFrame(updateFtPath);
}

const activate = () => {

    audioCaptureStore.inputNode.connect(analyser);
    masterFx.myInput.connect(analyser);

    if (currentScheduledUpdate) cancelAnimationFrame(currentScheduledUpdate);
    currentScheduledUpdate = requestAnimationFrame(updateFtPath);

}
const deactivate = () => {
    cancelAnimationFrame(currentScheduledUpdate);
    capturedTones.value.clear();
    audioCaptureStore.inputNode.disconnect(analyser);
    masterFx.myInput.disconnect(analyser);
}


onMounted(() => {
    activate();
});

onBeforeUnmount(() => {
    deactivate();
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

        <template v-for="[k, capturedTone] in capturedTones">
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
