import { defineStore } from "pinia";
import { onMounted, ref, watchEffect } from "vue";

export const userCustomPerformanceSettings = 'RbftAFPvQd-zGucC2xGaS-performance-settings';

export enum ViewportTech {
    Canvas, Pixi, Svg
}

export const useCustomSettingsStore = defineStore("custom settings store", () => {

    const viewportTech = ref(ViewportTech.Svg);
    const showFPS = ref(false);
    const fontSize = ref(12);

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
            }));
            console.log('saved user performance settings');
        });
    });


    return {
        deleteSettings,
        viewportTech,
        showFPS,
        fontSize,
    }
});