import { defineStore } from "pinia";
import { ref } from "vue";
import { useSynthStore } from "./synthStore";

export const useBottomPaneStateStore = defineStore("bottom pane state store", () => {
    const synthStore = useSynthStore();
    const activeLayerChannel = ref(synthStore.channels.chains[0] ?? null);
    return {
        activeLayerChannel,
    }
});