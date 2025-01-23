<script setup lang="ts">
import Button from "../components/Button.vue";
import Archive from "../components/icons/Archive.vue";
import CheckBoxBlank from "../components/icons/CheckBoxBlank.vue";
import CheckBoxChecked from "../components/icons/CheckBoxChecked.vue";
import Folder from "../components/icons/Folder.vue";
import { userConfirm } from "../functions/userConfirm";
import { KeyActions, getActionForKeys, getKeyCombinationString } from "../keyBindings";
import { useLibraryStore } from "../store/libraryStore";
import { useMonoModeInteraction } from "../store/monoModeInteraction";
import { useProjectStore } from "../store/projectStore";
import Collapsible from "./Collapsible.vue";

const monoModeInteraction = useMonoModeInteraction();
const project = useProjectStore();
const libraryStore = useLibraryStore();

const mainInteraction = monoModeInteraction.getInteractionModal("default");

const keyDownListener = (e: KeyboardEvent) => {

    if (e.target instanceof HTMLInputElement) {
        return;
    }
    const keyAction = getActionForKeys(e.key, e.ctrlKey, e.shiftKey, e.altKey);
    switch (keyAction) {
        case KeyActions.Save: {
            libraryStore.saveCurrent();
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        // case KeyActions.SaveAs: {
        // }
    }
}


mainInteraction.addEventListener(window, 'keydown', keyDownListener);


const clear = () => {
    libraryStore.clear();
}


</script>
<template>
    <Collapsible tooltip="Manage the projects that are stored in your browser's 'local storage'">
        <template #icon>
            <Folder />
            Working memory
        </template>
        <input type="text" v-model="project.name" @keydown="e => e.stopPropagation()" />
        <p v-if="libraryStore.errorMessage">{{ libraryStore.errorMessage }}</p>
        <template v-for="filename in libraryStore.filenamesList" :key="filename">
            <div style="display:block">
                <Button :onClick="() => libraryStore.loadFromLibraryItem(filename)" :active="project.name === filename">
                    {{ filename }}
                </Button>
                <Button :onClick="() => {
                        userConfirm(`Are you sure you want to delete ${filename}?`)
                            .accepted(()=>libraryStore.deleteItemNamed(filename))
                    }"
                    :danger="true" tooltip="Delete this item (!)">
                    ×
                </Button>
            </div>
        </template>
        <Button :onClick="() => libraryStore.saveCurrent()" v-if="!libraryStore.inSyncWithStorage"
            :tooltip="`Save to selected working memory slot ${getKeyCombinationString(KeyActions.SaveAs)}`"
        >
            <Archive />
            <sup>
            <CheckBoxBlank />
            </sup>
        </Button>
        <Button 
            v-else
            :active="false" 
            :onClick="()=>{}" 
            :tooltip="`Already saved ${getKeyCombinationString(KeyActions.SaveAs)}`"
        >
            <Archive />
            <sup>
            <CheckBoxChecked />
            </sup>
        </Button>

        <Button :onClick="clear" danger :tooltip="`Clear current composition`">
            clear
        </Button>

    </Collapsible>
</template>

    
<style>
input[type="file"] {
    display: none;
}
</style>