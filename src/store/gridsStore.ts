import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore';
import { octaveToFrequency } from '../functions/toneConverters';
import { useCustomOctavesTableStore } from './customOctavesTableStore';
import { useToolStore } from './toolStore';
import { paramRangeToAutomationRange } from '../dataTypes/AutomationPoint';
import { Tool } from '../dataTypes/Tool';

export interface GridLabel {
    text: string;
    x: number | null;
    y: number | null;
}

const shaveNumber = (n: number, maxLength: number = 5) => {
    const s = "" + n;
    if (s.length > maxLength) {
        return "~" + s.slice(0, maxLength);
    }
    return s;
}

export const useGridsStore = defineStore('grids', () => {
    const snap = useSnapStore();
    const view = useViewStore();
    const customOctaves = useCustomOctavesTableStore();
    const tool = useToolStore();

    // Helper: Automation grid
    function getAutomationGrid() {
        const py: number[] = [];
        const labels: GridLabel[] = [];
        const lane = tool.laneBeingEdited;
        const param = lane?.targetParameter;
        if (
            tool.current === Tool.Automation &&
            param &&
            typeof param.min === 'number' &&
            typeof param.max === 'number'
        ) {
            const values = [param.min, param.max, 0, 1, -1, 10, -10];
            const uniqueValues = Array.from(new Set(values.filter(v => v >= param.min && v <= param.max))).sort((a, b) => a - b);
            uniqueValues.forEach((v) => {
                const y = view.valueToPxWithOffset(paramRangeToAutomationRange(v, param));
                py.push(y);
                labels.push({
                    text: v.toString(),
                    x: null,
                    y,
                });
            });
        }
        return { py, labels };
    }

    // Helper: Custom frequency grid
    function getCustomFrequencyGrid() {
        const py: number[] = [];
        const labels: GridLabel[] = [];
        const octaves = customOctaves.table;
        for (let i = 0; i < octaves.length; i++) {
            const octave = octaves[i];
            if (!view.isOctaveInView(octave)) continue;
            const y = view.octaveToPxWithOffset(octave);
            py.push(y);
            const freq = octaveToFrequency(octave);
            labels.push({
                text: `${shaveNumber(octave)} (${freq.toFixed(2)} Hz)`,
                x: null,
                y,
            });
        }
        return { py, labels };
    }

    // Helper: Default octave grid
    function getDefaultOctaveGrid() {
        const py: number[] = [];
        const labels: GridLabel[] = [];
        for (let i = 1; i < 14; i++) {
            if (!view.isOctaveInView(i)) continue;
            const y = view.octaveToPxWithOffset(i);
            py.push(y);
            const freq = octaveToFrequency(i);
            labels.push({
                text: `${i} (${freq.toFixed(2)} Hz)`,
                x: null,
                y,
            });
        }
        return { py, labels };
    }

    // Computed for horizontal grid lines (octave/frequency/automation)
    const linePositionsPy = computed(() => {
        if (
            tool.current === Tool.Automation &&
            tool.laneBeingEdited &&
            tool.laneBeingEdited.targetParameter &&
            typeof tool.laneBeingEdited.targetParameter.min === 'number' &&
            typeof tool.laneBeingEdited.targetParameter.max === 'number'
        ) {
            return getAutomationGrid().py;
        }
        if (snap.values['customFrequencyTable']?.active) {
            return getCustomFrequencyGrid().py;
        }
        return getDefaultOctaveGrid().py;
    });

    // Computed for grid labels
    const lineLabels = computed(() => {
        if (
            tool.current === Tool.Automation &&
            tool.laneBeingEdited &&
            tool.laneBeingEdited.targetParameter &&
            typeof tool.laneBeingEdited.targetParameter.min === 'number' &&
            typeof tool.laneBeingEdited.targetParameter.max === 'number'
        ) {
            return getAutomationGrid().labels;
        }
        if (snap.values['customFrequencyTable']?.active) {
            return getCustomFrequencyGrid().labels;
        }
        return getDefaultOctaveGrid().labels;
    });

    // Computed for vertical grid lines (time)
    const linePositionsPx = computed(() => {
        const px: number[] = [];
        let prevX = 0;
        for (let i = 0; i < view.viewWidthTime + 1; i++) {
            const x = view.timeToPx(i - view.timeOffset % 1);
            px.push(x);
            if (prevX === 0 || x - prevX > 40) {
                prevX = x;
            }
        }
        return px;
    });

    return {
        linePositionsPx,
        linePositionsPy,
        lineLabels,
    };
});