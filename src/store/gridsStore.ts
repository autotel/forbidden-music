import { defineStore } from 'pinia';
import { Ref, ref, watchEffect } from 'vue';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore';

export const useGridsStore = defineStore('grids', () => {

    const snap = useSnapStore();
    const view = useViewStore();
    const linePositionsPx = ref([]) as Ref<number[]>;
    const linePositionsPy = ref([]) as Ref<number[]>;

    watchEffect(() => {
        linePositionsPx.value = [];
        for (let i = 0; i < view.viewWidthTime + 1; i++) {
            linePositionsPx.value.push(
                view.timeToPx(i - view.timeOffset % 1)
            );
        }
    });

    watchEffect(() => {
        linePositionsPy.value = [];
        if (snap.values['customFrequencyTable']?.active) {
            // display one line per frequency in the tableä
            const octaves = snap.customOctavesTable;
            for (let i = 0; i < octaves.length; i++) {
                const octave = octaves[i];
                if (!view.isOctaveInView(octave)) continue;
                linePositionsPy.value.push(
                    view.octaveToPxWithOffset(octave)
                );
            }
        } else {
            for (let i = 1; i < 14; i++) {
                if (!view.isOctaveInView(i)) continue;
                linePositionsPy.value.push(
                    view.octaveToPxWithOffset(i)
                );
            }
        }
    });

    return {
        linePositionsPx,
        linePositionsPy,
    };
});