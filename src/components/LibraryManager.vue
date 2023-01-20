<script setup lang="ts">
import { ref } from "vue";
import { usePlaybackStore } from "../store/playbackStore";
import { useEditNotesStore } from "../store/editNotesStore";
import Button from "./Button.vue";
import PropSlider from './PropSlider.vue';
import EdgeHidableWidget from "./EdgeHidableWidget.vue";
const editScore = useEditNotesStore();

const clear = () => {
    editScore.clear();
}
</script>
<template>
    <EdgeHidableWidget pulltip="save and load" title="file">
            <h2>File</h2>
            <input type="text" v-model="editScore.name" @keydown="e=>e.stopPropagation()"  />
            <p v-if="editScore.errorMessage" >{{editScore.errorMessage}}</p>
            <template v-for="filename in editScore.filenamesList" :key="filename">
                <div style="display:block" >
                    <Button :onClick="() => editScore.loadFromLibraryItem(filename)" :active="editScore.name === filename">
                        {{ filename }}
                    </Button>
                    <Button v-if="filename === editScore.name" :onClick="() => editScore.deleteItemNamed(filename)" :danger="true">
                        ×
                    </Button>
                </div>
            </template>
            <Button :onClick="() => editScore.saveCurrent()" v-if="!editScore.inSyncWithStorage">
                Save
            </Button>
            <p style="padding: 0.5em; display:inline-block;" v-else>In sync</p>

            <Button :onClick="clear" danger>clear</Button>
    </EdgeHidableWidget>

</template>

    
<style>
</style>