<script setup lang="ts">
import Button from "../components/Button.vue";
import Archive from "../components/icons/Archive.vue";
import Folder from "../components/icons/Folder.vue";
import Layers from "../components/icons/Layers.vue";
import Eye from "../components/icons/Eye.vue";
import EyeNot from "../components/icons/EyeNot.vue";
import CheckBoxChecked from "../components/icons/CheckBoxChecked.vue";
import CheckBoxBlank from "../components/icons/CheckBoxBlank.vue";
import SaveAs from "../components/icons/SaveAs.vue";
import isTauri, { ifTauri } from "../functions/isTauri";
import { KeyActions, getActionForKeys, getKeyCombinationString } from "../keyBindings";
import { useLibraryStore } from "../store/libraryStore";
import { useMonoModeInteraction } from "../store/monoModeInteraction";
import { useProjectStore } from "../store/projectStore";
import Collapsible from "./Collapsible.vue";
import { ref } from "vue";
import { useViewStore, layerNoteColorStrings } from "../store/viewStore";
import { useToolStore } from "../store/toolStore";
import { useSelectStore } from "../store/selectStore";
import SquarePlus from "../components/icons/SquarePlus.vue";
import Tooltip from "../components/Tooltip.vue";

const project = useProjectStore();
const view = useViewStore();
const tool = useToolStore();
const selection = useSelectStore();


const switchLayerVisibility = (layerNo: number) => {
    view.layerVisibility[layerNo] = !view.layerVisibility[layerNo];
}
const addLayer = () => {
    view.layerVisibility.push(true);
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
</script>
<template>
    <Collapsible pulltip="save and load" title="file">
        <template #icon>
            <Layers  clas="icon"/>
            Layers
        </template>
        <br>
        <div v-for="(visible, layerNo) in view.layerVisibility">
            <Button 
                style="width:100%; display:flex; justify-content: space-between;"
                :class="{ 'active': tool.currentLayerNumber === layerNo }"
                :onClick="()=>tool.currentLayerNumber = layerNo"
            >
                {{ layerNo?`Layer ${layerNo}`:'Base' }}
                <div v-if="layerNo" class="layer-color" :style="{ backgroundColor: layerNoteColorStrings[layerNo] }"></div>
                    <Button inline tooltip="Set selection's layer to this layer" :onClick="setSelectedNotesLayerToCurrent">
                        <SquarePlus />
                    </Button>
                <span v-on:click="switchLayerVisibility(layerNo)">
                    <Eye v-if="visible" />
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