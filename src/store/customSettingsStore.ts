import { defineStore } from "pinia";
import { computed, onMounted, ref, watchEffect } from "vue";
import nsLocalStorage from "../functions/nsLocalStorage";
import { useExclusiveContentsStore } from "./exclusiveContentsStore";
import { useViewStore } from "./viewStore";
import userCustomPerformanceSettingsKey from "./userCustomPerformanceSettingsKey";

export enum ViewportTech {
    Pixi, Svg
}

export const useCustomSettingsStore = defineStore("custom settings store", () => {
    const exclusives = useExclusiveContentsStore();
    const view = useViewStore();
    const viewportTech = ref(ViewportTech.Svg);
    const showFPS = ref(false);
    const fontSize = ref(12);
    const octaveToTimeRatio = ref(2.8);
    // polyphony cannot be undertood or used without layers thus far
    const _multiTimbralityEnabled = ref(false);
    const multiTimbralityEnabled = computed<boolean>({
        get() {
            return _multiTimbralityEnabled.value && layersEnabled.value;
        },
        set(value) {
            _multiTimbralityEnabled.value = value;
        }
    });
    const effectsEnabled = ref(true);
    const _layersEnabled = ref(false);
    const layersEnabled = computed<boolean>({
        get() {
            return _layersEnabled.value && exclusives.enabled;
        },
        set(value) {
            _layersEnabled.value = value;
        }
    });
    const midiInputEnabled = ref(false);
    const performanceSettingsEnabled = ref(true);
    const physicalEnabled = ref(false);

    const deleteSettings = () => {
        nsLocalStorage.removeItem(userCustomPerformanceSettingsKey);
        viewportTech.value = ViewportTech.Svg;
        showFPS.value = false;
        fontSize.value = 12;
        multiTimbralityEnabled.value = false;
        layersEnabled.value = false;
        midiInputEnabled.value = false;
        performanceSettingsEnabled.value = true;
        physicalEnabled.value = false;
        octaveToTimeRatio.value = 2.8;
        effectsEnabled.value = false;
    }

    onMounted(() => {
        const savedSettings = nsLocalStorage.getItem(userCustomPerformanceSettingsKey);
        try {
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                viewportTech.value = parsed.viewportTech;
                showFPS.value = parsed.showFPS;
                fontSize.value = parsed.fontSize;
                multiTimbralityEnabled.value = parsed.multiTimbralityEnabled;
                layersEnabled.value = parsed.layersEnabled;
                midiInputEnabled.value = parsed.midiInputEnabled;
                performanceSettingsEnabled.value = parsed.performanceSettingsEnabled;
                physicalEnabled.value = parsed.physicalEnabled;
                octaveToTimeRatio.value = parsed.octaveToTimeRatio || 2.8;
                effectsEnabled.value = parsed.effectsEnabled || false;
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
                multiTimbralityEnabled: multiTimbralityEnabled.value,
                layersEnabled: layersEnabled.value,
                midiInputEnabled: midiInputEnabled.value,
                performanceSettingsEnabled: performanceSettingsEnabled.value,
                physicalEnabled: physicalEnabled.value,
                octaveToTimeRatio: octaveToTimeRatio.value,
                effectsEnabled: effectsEnabled.value,
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
        multiTimbralityEnabled,
        effectsEnabled,
        layersEnabled,
        midiInputEnabled,
        performanceSettingsEnabled,
        physicalEnabled,
        octaveToTimeRatio,
    }
});