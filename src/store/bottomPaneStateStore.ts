import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useSynthStore } from "./synthStore";
import { useThrottleFn } from "@vueuse/core";
import { useProjectStore } from "./projectStore";
import { useLibraryStore } from "./libraryStore";

export const useBottomPaneStateStore = defineStore("bottom pane state store", () => {
    const synthStore = useSynthStore();
    const activeLayerChannel = ref(synthStore.channels.chains[0] ?? null);
    const project = useProjectStore();
    const libraryStore = useLibraryStore();
    const focusNewChannel = useThrottleFn(() => {
        if (synthStore.channels.chains.length > 0) {
            activeLayerChannel.value = synthStore.channels.chains[0];
        }
    }, 200);
    watch(()=>synthStore.channels, () => { focusNewChannel() });
    return {
        activeLayerChannel,
    }
});