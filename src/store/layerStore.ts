import { Note } from "@/dataTypes/Note";
import { Trace } from "@/dataTypes/Trace";
import { defineStore } from "pinia";
import { ref } from "vue";

export interface LayerSynthAssociation {
    layer: number;
    synth: number;
}

export interface Layer {
    visible: boolean;
    locked: boolean;
    mute: boolean;
    channelSlot: number;
    name?: string;
}

export const useLayerStore = defineStore("layer", () => {
    const layers = ref<Layer[]>([]);

    const isVisible = (layer: number): boolean => {
        if(!layers.value[layer]) {
            return false;
        }
        return layers.value[layer].visible;
    }

    const isMute = (layer: number): boolean => {
        if(!layers.value[layer]) {
            return true;
        }
        return layers.value[layer].mute;
    }
    
    const isLocked = (layer: number): boolean => {
        if(!layers.value[layer]) {
            return true;
        }
        return layers.value[layer].locked;
    }

    const isTraceLocked = (trace: Trace) => {
        if(!('layer' in trace)) return false
        return layers.value[trace.layer]?.locked === true;
    }

    const onlyUnlocked = (notes: Note[]) => {
        return notes.filter((n)=>layers.value[n.layer]?.locked === false)
    }

    const addLayer = () => {
        const newLayer = {
            visible: true,
            locked: false,
            mute: false,
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
            mute: false,
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
        isVisible, isMute, isLocked,
        isTraceLocked,
        onlyUnlocked,
        addLayer,
        clear,
    };
});