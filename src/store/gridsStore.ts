import { defineStore } from 'pinia';
import { Ref, ref, watchEffect } from 'vue';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore';

export interface GridLabel {
    text: string;
    x: number | null;
    y: number | null;
}

export const useGridsStore = defineStore('grids', () => {

    const snap = useSnapStore();
    const view = useViewStore();
    const linePositionsPx = ref([]) as Ref<number[]>;
    const linePositionsPy = ref([]) as Ref<number[]>;
    const lineLabels = ref([]) as Ref<GridLabel[]>;

    watchEffect(() => {
        linePositionsPx.value = [];
        linePositionsPy.value = [];
        lineLabels.value = [];
        for (let i = 0; i < view.viewWidthTime + 1; i++) {
            const px = view.timeToPx(i - view.timeOffset % 1);
            linePositionsPx.value.push(
                px
            );
            lineLabels.value.push({
                text: `${Math.floor(i + view.timeOffset)}`,
                x: px,
                y: null,
            });
        }
        
        if (snap.values['customFrequencyTable']?.active) {
            // display one line per frequency in the tableä
            const octaves = snap.customOctavesTable;
            for (let i = 0; i < octaves.length; i++) {
                const octave = octaves[i];
                if (!view.isOctaveInView(octave)) continue;
                const py = view.octaveToPxWithOffset(octave)
                linePositionsPy.value.push(
                    py
                );
                lineLabels.value.push({
                    text: `${octave}`,
                    x: null,
                    y: py,
                });
            }
        } else {
            for (let i = 1; i < 14; i++) {
                if (!view.isOctaveInView(i)) continue;
                const py = view.octaveToPxWithOffset(i);
                linePositionsPy.value.push(
                    py
                );
                lineLabels.value.push({
                    text: `${i}`,
                    x: null,
                    y: py,
                });
            }
        }
    });

    return {
        linePositionsPx,
        linePositionsPy,
        lineLabels,
    };
});