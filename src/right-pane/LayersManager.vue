<script setup lang="ts">
import Button from "../components/Button.vue";
import ButtonSub from "../components/ButtonSub.vue";
import Tooltip from "../components/Tooltip.vue";
import Eye from "../components/icons/Eye.vue";
import EyeNot from "../components/icons/EyeNot.vue";
import Layers from "../components/icons/Layers.vue";
import SquarePlus from "../components/icons/SquarePlus.vue";
import { useCommunicationStore } from "../store/communicationStore";
import { useCustomSettingsStore } from "../store/customSettingsStore";
import { useLayerStore } from "../store/layerStore";
import { useProjectStore } from "../store/projectStore";
import { useSelectStore } from "../store/selectStore";
import { useToolStore } from "../store/toolStore";
import { layerNoteColorStrings } from "../store/viewStore";
import Collapsible from "./Collapsible.vue";

const communications = useCommunicationStore();
const tool = useToolStore();
const selection = useSelectStore();
const layers = useLayerStore();
const settings = useCustomSettingsStore();
const project = useProjectStore();
const switchLayerVisibility = (layerNo: number) => {
    const layer = layers.layers[layerNo];
    layer.visible = !layer.visible;
}
const addLayer = () => {
    layers.addLayer();
}
const setSelectedNotesLayerToCurrent = () => {
    const selectedNotes = selection.getNotes();
    if (selectedNotes.length) {
        const layer = tool.currentLayerNumber;
        for (const note of selectedNotes) {
            note.layer = layer;
        }
    }
}

const handleRemoveClick = (no: number, element: HTMLElement) => {
    console.log('handleRemoveClick');
    const isLayerEmpty = project.notes.filter(note => note.layer === no).length === 0;
    const notesToLayerTranspose = project.notes.filter(note => note.layer > no);
    if (isLayerEmpty) {
        layers.layers.splice(no, 1);
        notesToLayerTranspose.forEach(note => note.layer--);
    } else {
        communications.mousePopup(
            "You need to empty this layer before being able to delete it.",
            element
        );
    }

}
</script>
<template>
    <Collapsible
        tooltip="Distribute the notes into different layers if that makes editing easier">
        <template #icon>
            <Layers clas="icon" />
            Layers
        </template>
        <br>
        <div v-for="(layer, layerNo) in layers.layers">
            <Button style="width:100%; display:flex; justify-content: space-between;"
                :class="{ 'active': tool.currentLayerNumber === layerNo }"
                :onClick="() => tool.currentLayerNumber = layerNo">
                <ButtonSub danger :onClick="() => handleRemoveClick(layerNo, $el)" tooltip="delete">×</ButtonSub>

                {{ layerNo ? `Layer ${layerNo}` : 'Base' }}
                <div v-if="layerNo" class="layer-color" :style="{ backgroundColor: layerNoteColorStrings[layerNo] }">
                </div>
                <Button inline tooltip="Set selection's layer to this layer" :onClick="setSelectedNotesLayerToCurrent">
                    <SquarePlus />
                </Button>
                <Tooltip tooltip="Assign a synth channel to this layer.">
                    <input type="number" step="1" style="width: 2em; overflow: hidden;" v-model="layer.channelSlot" />
                </Tooltip>
                <span v-on:click="switchLayerVisibility(layerNo)">
                    <Eye v-if="layers.isVisible(layerNo)" />
                    <EyeNot v-else />
                </span>
            </Button>
        </div>
        <Button @click="addLayer">+</Button>

    </Collapsible>
</template>


<style>
input[type="file"] {
    display: none;
}

.layer-color {
    border-radius: 50%;
    width: 20px;
    height: 20px;
    border: 1px solid black;
}
</style>