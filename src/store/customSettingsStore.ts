import { defineStore } from "pinia";
import { onMounted, ref, watchEffect } from "vue";
import nsLocalStorage from "../functions/nsLocalStorage";
import userCustomPerformanceSettingsKey from "./userCustomPerformanceSettingsKey";
import { useViewStore } from "./viewStore";

export enum ViewportTech {
    Pixi, Svg
}

export const useCustomSettingsStore = defineStore("custom settings store", () => {
    const view = useViewStore();
    const viewportTech = ref(ViewportTech.Svg);
    const showFPS = ref(false);
    const fontSize = ref(12);
    const octaveToTimeRatio = ref(2.8);
    const showHarp = ref(false);
    
    const midiInputEnabled = ref(false);
    const performanceSettingsEnabled = ref(true);
    const physicalEnabled = ref(false);

    const deleteSettings = () => {
        nsLocalStorage.removeItem(userCustomPerformanceSettingsKey);
        viewportTech.value = ViewportTech.Svg;
        showFPS.value = false;
        fontSize.value = 12;
        midiInputEnabled.value = false;
        performanceSettingsEnabled.value = true;
        physicalEnabled.value = false;
        octaveToTimeRatio.value = 2.8;
        showHarp.value = false;
    }

    onMounted(() => {
        const savedSettings = nsLocalStorage.getItem(userCustomPerformanceSettingsKey);
        try {
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                viewportTech.value = parsed.viewportTech;
                showFPS.value = parsed.showFPS;
                fontSize.value = parsed.fontSize;
                midiInputEnabled.value = parsed.midiInputEnabled;
                performanceSettingsEnabled.value = parsed.performanceSettingsEnabled;
                physicalEnabled.value = parsed.physicalEnabled;
                octaveToTimeRatio.value = parsed.octaveToTimeRatio || 2.8;
                showHarp.value = parsed.showHarp || false;
            }
        } catch (e) {
            console.error('could not recall user performance settings', e);
            deleteSettings();
        }


        watchEffect(() => {
            nsLocalStorage.setItem(userCustomPerformanceSettingsKey, JSON.stringify({
                viewportTech: viewportTech.value,
                showFPS: showFPS.value,
                fontSize: fontSize.value,
                midiInputEnabled: midiInputEnabled.value,
                performanceSettingsEnabled: performanceSettingsEnabled.value,
                physicalEnabled: physicalEnabled.value,
                octaveToTimeRatio: octaveToTimeRatio.value,
                showHarp: showHarp.value,
            }));
            console.log('saved user performance settings');
        });


        watchEffect(() => {
            view.setOctaveToTimeRatio(octaveToTimeRatio.value);
        })


    });


    return {
        deleteSettings,
        viewportTech,
        showFPS,
        fontSize,
        midiInputEnabled,
        performanceSettingsEnabled,
        physicalEnabled,
        octaveToTimeRatio,
        showHarp,
    }
});