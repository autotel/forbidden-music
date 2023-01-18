<script setup lang="ts">
import { ref } from "vue";
import { usePlaybackStore } from "../store/playbackStore";
import { useEditNotesStore } from "../store/editNotesStore";
import Button from "./Button.vue";
import PropSlider from './PropSlider.vue';
const playback = usePlaybackStore();
const showing = ref(true);
const editScore = useEditNotesStore();
</script>
<template>
    <div id="libraryWindow" :class="{ hide: !showing }" style="">
        <h2>File</h2>
        <Button :onClick="() => showing = !showing" class="show-hide">
            {{ showing? '◁': '▷' }}
        </Button>

        <input type="text" v-model="editScore.name" @keydown="e=>e.stopPropagation()"  />
        <p v-if="editScore.errorMessage" >{{editScore.errorMessage}}</p>
        <template v-for="filename in editScore.filenamesList">
            <div style="display:flex">
                <Button :onClick="() => editScore.loadFromLibraryItem(filename)" :active="editScore.name === filename">
                    {{ filename }}
                </Button>
                <Button :onClick="() => editScore.deleteItemNamed(filename)" :danger="true">
                    ×
                </Button>
            </div>
        </template>
        <Button :onClick="() => editScore.saveCurrent()">
            {{ editScore.inSyncWithStorage? 'in sync': 'save' }}
        </Button>
    </div>

</template>

    
<style>
#libraryWindow {
    position: fixed;
    left: 0;
    top: 30%;
    width: 300px;
    transition: left 0.3s;
}

#libraryWindow.hide .show-hide:hover {
    right: -2em;
}

#libraryWindow.hide .show-hide {
    right: -1em;
}

#libraryWindow .show-hide {
    position: absolute;
    right: -2em;
    top: 0;
    height: 100%;
    transition: right 0.3s;
}

#libraryWindow.hide {
    left: -300px;
}
</style>