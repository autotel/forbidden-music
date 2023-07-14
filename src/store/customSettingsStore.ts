import { defineStore } from "pinia";
import { ref } from "vue";
import { ifDev } from "../functions/isDev";
import { ifTauri } from "../functions/isTauri";

export enum ViewportTech {
    Canvas, Pixi, Svg
}

export const useCustomSettingsStore = defineStore("custom settings store", () => {
    const viewportTech = ref(ViewportTech.Pixi);
    const showFPS = ref(false);
    const fontSize = ref(12);

    return {
        viewportTech,
        showFPS,
        fontSize,
    }
});