import { defineStore } from "pinia";
import { computed, onMounted, ref, watchEffect, WritableComputedRef } from "vue";

export const userCustomPerformanceSettings = 'RbftAFPvQd-zGucC2xGaS-performance-settings';

export enum ViewportTech {
    Canvas, Pixi, Svg
}

export const useCustomSettingsStore = defineStore("custom settings store", () => {

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

    const layersEnabled = ref(false);
    const midiInputEnabled = ref(false);
    const performanceSettingsEnabled = ref(true);

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
                viewportTech.value = parsed.viewportTech;
                showFPS.value = parsed.showFPS;
                fontSize.value = parsed.fontSize;
                polyphonyEnabled.value = parsed.polyphonyEnabled;
                layersEnabled.value = parsed.layersEnabled;
                midiInputEnabled.value = parsed.midiInputEnabled;
                performanceSettingsEnabled.value = parsed.performanceSettingsEnabled;
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
    }
});