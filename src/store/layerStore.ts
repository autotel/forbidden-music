import { defineStore } from "pinia";
import { ref } from "vue";
import { usePlaybackStore } from "./playbackStore";
import { useSynthStore } from "./synthStore";
import { SynthChain } from "../dataStructures/SynthChain";

export interface LayerSynthAssociation {
    layer: number;
    synth: number;
}

export interface Layer {
    visible: boolean;
    locked: boolean;
    channelSlot: number;
    name?: string;
}

export const useLayerStore = defineStore("layer", () => {
    const synth = useSynthStore();
    const layers = ref<Layer[]>([]);

    const isVisible = (layer: number): boolean => {
        if(!layers.value[layer]) {
            return false;
        }
        return layers.value[layer].visible;
    }

    const addLayer = () => {
        const newLayer = {
            visible: true,
            locked: false,
            channelSlot: 0,
        }
        layers.value.push(newLayer);
        console.log("layers.value", layers.value); 
        return newLayer;
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
        isVisible,
        addLayer,
        clear,
    };
});