import { defineStore } from "pinia";
import { SynthChannel, usePlaybackStore } from "./playbackStore";
import { ref } from "vue";

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
    const playback = usePlaybackStore();
    const layers = ref<Layer[]>([]);

    const getLayerChannel = (layer: number): SynthChannel => {
        const slotNo = layers.value[layer].channelSlot;
        const synthIfExists = playback.channels[slotNo];
        if (!synthIfExists) {
            return playback.channels[0];
        }
        return synthIfExists;
    }

    const isVisible = (layer: number): boolean => {
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

    return {
        layers,
        getOrMakeLayerWithIndex,
        getLayerChannel,
        isVisible,
        addLayer,
    };
});