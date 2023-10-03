import { defineStore } from "pinia";
import { computed, onMounted, ref, watchEffect } from "vue";
import isTauri from "../functions/isTauri";
import nsLocalStorage from "../functions/nsLocalStorage";
import { useExclusiveContentsStore } from "./exclusiveContentsStore";
import { useViewStore } from "./viewStore";

export const userCustomPerformanceSettings = 'RbftAFPvQd-zGucC2xGaS-performance-settings';

export enum ViewportTech {
    Canvas, Pixi, Svg
}

const bool =  (v:unknown) => v === 'true' || v === true;

export const useCustomSettingsStore = defineStore("custom settings store", () => {
    const view = useViewStore();
    const exclusives = useExclusiveContentsStore();
    const viewportTech = ref(ViewportTech.Svg);
    const showFPS = ref(false);
    const fontSize = ref(12);
    const octaveToTimeRatio = ref(1.4);
    // polyphony cannot be undertood or used without layers thus far
    const _polyphonyEnabled = ref(false);
    const polyphonyEnabled = computed<boolean>({
        get() {
            return _polyphonyEnabled.value && layersEnabled.value;
        },
        set(value) {
            _polyphonyEnabled.value = value;
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
        nsLocalStorage.removeItem(userCustomPerformanceSettings);
        viewportTech.value = ViewportTech.Svg;
        showFPS.value = false;
        fontSize.value = 12;
        polyphonyEnabled.value = false;
        layersEnabled.value = false;
        midiInputEnabled.value = false;
        performanceSettingsEnabled.value = true;
        physicalEnabled.value = false;
        octaveToTimeRatio.value = 1.4;
        effectsEnabled.value = false;
    }

    onMounted(() => {
        const savedSettings = nsLocalStorage.getItem(userCustomPerformanceSettings);
        try {
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                viewportTech.value = parsed.viewportTech;
                showFPS.value = parsed.showFPS;
                fontSize.value = parsed.fontSize;
                polyphonyEnabled.value = parsed.polyphonyEnabled;
                layersEnabled.value = parsed.layersEnabled;
                midiInputEnabled.value = parsed.midiInputEnabled;
                performanceSettingsEnabled.value = parsed.performanceSettingsEnabled;
                physicalEnabled.value = parsed.physicalEnabled;
                octaveToTimeRatio.value = parsed.octaveToTimeRatio || 1;
                effectsEnabled.value = parsed.effectsEnabled || false;
            }
        } catch (e) {
            console.error('could not recall user performance settings', e);
            deleteSettings();
        }


        watchEffect(() => {
            nsLocalStorage.setItem(userCustomPerformanceSettings, JSON.stringify({
                viewportTech: viewportTech.value,
                showFPS: showFPS.value,
                fontSize: fontSize.value,
                polyphonyEnabled: polyphonyEnabled.value,
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
        polyphonyEnabled,
        effectsEnabled,
        layersEnabled,
        midiInputEnabled,
        performanceSettingsEnabled,
        physicalEnabled,
        octaveToTimeRatio,
    }
});