import { PatcheableTrait } from "@/dataTypes/PatcheableTrait";
import { useThrottleFn } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { SynthChain } from "../dataStructures/SynthChain";
import { useSynthStore } from "./synthStore";

export type DragData = {
    patcheable: PatcheableTrait;
    removeCallback: () => void;
}

export const synthPaneHeight = 300;
export const useBottomPaneStateStore = defineStore("bottom pane state store", () => {
    const synthStore = useSynthStore();
    const activeLayerChannel = ref<SynthChain | null>(synthStore.channels.children[0] ?? null);
    const synthPaneOpen = ref(false);
    const toolbarMeasuredHeight = ref(0);
    const rightyMode = ref(false);
    const totalHeight = computed(() => {
        const toolPanelH = toolbarMeasuredHeight.value;
        return (synthPaneOpen.value ? synthPaneHeight : 0) + toolPanelH;
    });
    const patcheableBeingDragged = ref<DragData | false>(false);
    const focusNewChannel = useThrottleFn(() => {
        if (synthStore.channels.children.length > 0) {
            activeLayerChannel.value = synthStore.channels.children[0];
        }
    }, 200);
    watch(() => synthStore.channels, () => { focusNewChannel() });
    return {
        toolbarMeasuredHeight,
        activeLayerChannel,
        totalHeight,
        synthPaneOpen,
        rightyMode,
        patcheableBeingDragged,
    }
});