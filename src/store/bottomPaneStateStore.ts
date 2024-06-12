import { defineStore } from "pinia";
import { ref } from "vue";
import { ifDev } from "../functions/isDev";
import { ifTauri } from "../functions/isTauri";
import { SynthChannel, useSynthStore } from "./synthStore";

export const useBottomPaneStateStore = defineStore("bottom pane state store", () => {
    const synthStore = useSynthStore();
    const activeLayerChannel = ref<SynthChannel>(synthStore.channels[0]);
    return {
        activeLayerChannel,
    }
});