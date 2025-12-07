import { frequencyToOctave, octaveToFrequency } from "@/functions/toneConverters";
import colundi from "@/scales/colundi";
import { defineStore } from "pinia";
import { ref, computed,watch } from "vue";

export const useCustomOctavesTableStore = defineStore('custom-octaves-table', () => {
    const setOctaves = ref(colundi as number[]);
    const setFrequencies = ref(colundi as number[]);
    const frequenciesMode = ref(false);

    const table = computed(() => {
        if (frequenciesMode.value) {
            return setFrequencies.value.map(n=>frequencyToOctave(n));
        } else {
            return setOctaves.value;
        }
    });

    const setCurrent = (value: number[]) => {
        if(frequenciesMode) {
            setFrequencies.value = value;
        }else{
            setOctaves.value = value;
        }
    }

    return {
        setOctaves,
        setFrequencies,
        setCurrent,
        frequenciesMode,
        table,
    }
})