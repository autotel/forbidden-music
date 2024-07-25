import { note } from '@/dataTypes/Note';
import { OctavePosition, TimeRange, getDuration } from '@/dataTypes/TimelineItem';
import { frequencyToOctave, octaveToFrequency } from '@/functions/toneConverters';
import { useAudioCaptureStore } from '@/store/audioCaptureStore';
import { useAudioContextStore } from '@/store/audioContextStore';
import { useMasterEffectsStore } from '@/store/masterEffectsStore';
import { useProjectStore } from '@/store/projectStore';
import { useToolStore } from '@/store/toolStore';
import { defineStore } from "pinia";
import { ref } from 'vue';
import { usePlaybackStore } from '../store/playbackStore';
import { useViewStore } from '../store/viewStore';

export type CapturedTone = OctavePosition & TimeRange & { identifier: number };


export type AnalyzedCallback = (data: { filteredData: number[] }) => void;

export const useFtCaptureStore = defineStore('ftCapture', () => {

    const view = useViewStore();
    const playback = usePlaybackStore();
    const masterFx = useMasterEffectsStore();
    const audioContextStore = useAudioContextStore();
    const audioCaptureStore = useAudioCaptureStore();
    const project = useProjectStore();
    const tool = useToolStore();

    const recordToNotes = ref(false);

    const debugValues = false;
    const capturedTones = ref<Map<number, CapturedTone>>(new Map());


    const analyser = audioContextStore.audioContext.createAnalyser();
    analyser.fftSize = 4096 * 2;
    const ftFrequency = audioContextStore.audioContext.sampleRate / analyser.fftSize;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    const convertToNote = (captured: CapturedTone) => {
        const nNote = note(captured);
        nNote.layer = tool.currentLayerNumber;
        project.notes.push(nNote);
        capturedTones.value.delete(captured.identifier);
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

    const freqToFtBin = (freq: number) => {
        const binNo = freq / ftFrequency;
        return Math.round(binNo);
    }
    const ftBinToFreq = (binNo: number) => {
        return binNo * ftFrequency;
    }

    const minBin = freqToFtBin(110);
    const maxBin = freqToFtBin(6000);

    const topPeaksTracker = createPeaksTracker(maxBin, minBin);

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
            if (recordToNotes.value && value.timeEnd < playback.currentScoreTime) {
                if (getDuration(value) > 0.3) {
                    convertToNote(value);
                }
            }
        }
    }

    const analyzedCallbacks: AnalyzedCallback[] = [];
    const addAnalyzedCallback = (cb: AnalyzedCallback) => {
        analyzedCallbacks.push(cb);
    }
    const removeAnalyzedCallback = (cb: AnalyzedCallback) => {
        const index = analyzedCallbacks.indexOf(cb);
        if (index > -1) {
            analyzedCallbacks.splice(index, 1);
        }
    }
    let currentScheduledUpdate = false as any;

    const analyze = () => {
        analyser.getFloatFrequencyData(dataArray);


        let runningAverage = dataArray[0];
        const hpk = 0.94;
        const ihpk = 1 - hpk;


        const highPassedData: number[] = [...dataArray].map(d => {
            runningAverage = runningAverage * hpk + d * ihpk;
            return d - runningAverage;
        });

        const lpk = 0.95;
        const ilpk = 1 - lpk;

        const lowPassedData: number[] = [...dataArray].map(d => {
            runningAverage = runningAverage * lpk + d * ilpk;
            return runningAverage;
        });



        const thresholdedData: number[] = [...dataArray].map((d, i) => {
            const thresh = lowPassedData[i] * 4 / 5;
            if (d < thresh) return 0;
            return d + 127;
        });

        const filteredData = thresholdedData;
        // const filteredData = dataArray;
        // const filteredData = thresholdedData;
        // const filteredData = lowPassedData;

        topPeaksTracker.analyzeFt([...filteredData]);


        let keepTones = new Set<number>();
        for (let peak of topPeaksTracker.peaks) {
            if (!peak.keep) continue;
            const frequency = ftBinToFreq(peak.bin);
            const octave = frequencyToOctave(frequency);

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
            keepTones.add(peak.identifier);

        }


        flushCapturedTones();

        currentScheduledUpdate = requestAnimationFrame(analyze);

        analyzedCallbacks.map((cb: AnalyzedCallback) => cb({ filteredData }));
    }


    const activate = async () => {

        await audioCaptureStore.requestAudioCapture()
        audioCaptureStore.inputNode.connect(analyser);
        masterFx.myInput.connect(analyser);

        if (currentScheduledUpdate) cancelAnimationFrame(currentScheduledUpdate);
        currentScheduledUpdate = requestAnimationFrame(analyze);

    }
    const deactivate = async () => {
        cancelAnimationFrame(currentScheduledUpdate);
        capturedTones.value.clear();
        try {
            audioCaptureStore.inputNode.disconnect(analyser);
        } catch (e) { console.error(e) }
        try {
            masterFx.myInput.disconnect(analyser);
        } catch (e) { console.error(e) }
    }
    return {
        analyser,
        dataArray,
        octaveToFtBin, ftBinToFreq, pxToFtBin,
        minBin, maxBin,
        analyze,
        topPeaksTracker, capturedTones,
        activate, deactivate, 
        deleteCapturedTonesAtTime, flushCapturedTones,
        
        addAnalyzedCallback, removeAnalyzedCallback,
        recordToNotes,
    }


});



export interface TrackedPeak {
    bin: number;
    keep: number;
    identifier: number;
}
const createPeaksTracker = ((maxBin: number, minBin: number) => {
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
        peaks,
    }
});
