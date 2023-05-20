<script setup lang="ts">
import { useLibraryStore } from "../store/libraryStore";
import { useProjectStore } from "../store/projectStore";
import Button from "./Button.vue";
import EdgeHidableWidget from "./EdgeHidableWidget.vue";
import Folder from "./icons/Folder.vue";
const project = useProjectStore();
const libraryStore = useLibraryStore();
const clear = () => {
    libraryStore.clear();
}

const showJsonBrowser = () => {

    let fileInput = document.getElementById('fileInput.JSONUpload') as HTMLInputElement;
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.id = 'fileInput.JSONUpload';
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = (evt: any) => {
            libraryStore.importJSON(evt.target.files);
        }
    }
    fileInput.click();
}

</script>
<template>
    <EdgeHidableWidget pulltip="save and load" title="file">
        <template #icon>
            <Folder />
        </template>
        <h2>File</h2>
        <input type="text" v-model="project.name" @keydown="e => e.stopPropagation()" />
        <p v-if="libraryStore.errorMessage">{{ libraryStore.errorMessage }}</p>
        <template v-for="filename in libraryStore.filenamesList" :key="filename">
            <div style="display:block">
                <Button :onClick="() => libraryStore.loadFromLibraryItem(filename)"
                    :active="project.name === filename">
                    {{ filename }}
                </Button>
                <Button v-if="filename === project.name" :onClick="() => libraryStore.deleteItemNamed(filename)"
                    :danger="true">
                    ×
                </Button>
            </div>
        </template>
        <Button :onClick="() => libraryStore.saveCurrent()" v-if="!libraryStore.inSyncWithStorage">
            Save
        </Button>
        <p style="padding: 0.5em; display:inline-block;" v-else>In sync</p>

        <Button :onClick="clear" danger>clear</Button>

        <h2>Save to computer</h2>

        <Button :onClick="() => libraryStore.exportJSON()" v-if="project.name">
            Download JSOn
        </Button>
        <Button :onClick="showJsonBrowser">Import JSON</Button>

    </EdgeHidableWidget>
</template>

    
<style>
input[type="file"] {
    display: none;
}
</style>