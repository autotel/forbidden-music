import { defineStore } from "pinia";
import { ref } from "vue";
import { usePlaybackStore } from "./playbackStore";
import { SynthChannel, useSynthStore } from "./synthStore";

export interface LayerSynthAssociation {
    layer: number;
    synth: number;
}

export interface Layer {
    visible: boolean;
    locked: boolean;
    channelSlot: number;
}

export const useLayerStore = defineStore("layer", () => {
    const synth = useSynthStore();
    const layers = ref<Layer[]>([]);

    const getLayerChannel = (layer: number): SynthChannel => {
        const slotNo = layers.value[layer].channelSlot;
        const synthIfExists = synth.channels[slotNo];
        if (!synthIfExists) {
            return synth.channels[0];
        }
        return synthIfExists;
    }

    const isVisible = (layer: number): boolean => {
        if(!layers.value[layer]) {
            return false;
        }
        return layers.value[layer].visible;
    }

    const addLayer = () => {
        layers.value.push({
            visible: true,
            locked: false,
            channelSlot: 0,
        });
        console.log("layers.value", layers.value); 
    }

    const getOrMakeLayerWithIndex = (layer: number) => {
        if (layers.value[layer]) return layers.value[layer];

        layers.value[layer] = {
            visible: true,
            locked: false,
            channelSlot: 0,
        };
        return layers.value[layer];
    }

    getOrMakeLayerWithIndex(0);

    if(!layers.value[0]) {
        throw new Error("No layer 0");
    }

    const clear = () => {
        layers.value = [];
        getOrMakeLayerWithIndex(0);
    }

    return {
        layers,
        getOrMakeLayerWithIndex,
        getLayerChannel,
        isVisible,
        addLayer,
        clear,
    };
});