import { defineStore } from "pinia";
import { computed, onMounted, ref, watchEffect, WritableComputedRef } from "vue";
import { useExclusiveContentsStore } from "./exclusiveContentsStore";
import isTauri from "../functions/isTauri";

export const userCustomPerformanceSettings = 'RbftAFPvQd-zGucC2xGaS-performance-settings';

export enum ViewportTech {
    Canvas, Pixi, Svg
}

const bool =  (v:unknown) => v === 'true' || v === true;

export const useCustomSettingsStore = defineStore("custom settings store", () => {
    const exclusives = useExclusiveContentsStore();
    const viewportTech = ref(ViewportTech.Svg);
    const showFPS = ref(false);
    const fontSize = ref(12);
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
        localStorage.removeItem(userCustomPerformanceSettings);
        viewportTech.value = ViewportTech.Svg;
        showFPS.value = false;
        fontSize.value = 12;
    }

    onMounted(() => {
        const savedSettings = localStorage.getItem(userCustomPerformanceSettings);
        try {
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                viewportTech.value = parsed.viewportTech || 0;
                showFPS.value = bool(parsed.showFPS);
                fontSize.value = parsed.fontSize || fontSize.value;
                polyphonyEnabled.value = bool(parsed.polyphonyEnabled);
                layersEnabled.value = bool(parsed.layersEnabled);
                midiInputEnabled.value = bool(parsed.midiInputEnabled);
                performanceSettingsEnabled.value = isTauri() ? true : bool(parsed.performanceSettingsEnabled);
                physicalEnabled.value = bool(parsed.physicalEnabled);
            }
        } catch (e) {
            console.error('could not recall user performance settings', e);
            deleteSettings();
        }


        watchEffect(() => {
            localStorage.setItem(userCustomPerformanceSettings, JSON.stringify({
                viewportTech: viewportTech.value,
                showFPS: showFPS.value,
                fontSize: fontSize.value,
                polyphonyEnabled: polyphonyEnabled.value,
                layersEnabled: layersEnabled.value,
                midiInputEnabled: midiInputEnabled.value,
                performanceSettingsEnabled: performanceSettingsEnabled.value,
                physicalEnabled: physicalEnabled.value,
            }));
            console.log('saved user performance settings');
        });
    });


    return {
        deleteSettings,
        viewportTech,
        showFPS,
        fontSize,
        polyphonyEnabled,
        layersEnabled,
        midiInputEnabled,
        performanceSettingsEnabled,
        physicalEnabled,
    }
});