<script setup lang="ts">
import ButtonSub from "@/components/ButtonSub.vue";
import externalSampleLibrariesStore from "@/store/externalSampleLibrariesStore";
import Button from "../components/Button.vue";
import Folder from "../components/icons/Folder.vue";
import Collapsible from "./Collapsible.vue";
import { ref, watch } from "vue";

const externalSampleLibraries = externalSampleLibrariesStore();

const deleteSampleLibrary = (url: string) => {
    externalSampleLibraries.removeLibraryUrl(url);
};

const addSampleLibrary = async () => {
    const url = newLibrary.value;
    if (url) {
        console.log("adding", url);
        externalSampleLibraries.addLibraryUrl(url);
    }
};

const newLibrary = ref('');

</script>
<template>
    <Collapsible tooltip="Manage extra content">
        <template #icon>
            <Folder clas="icon"/>
            Extra Content
        </template>
        <div class="contents-list">
            <div v-for="library in externalSampleLibraries.listOfExternalLibs" class="library">
                <div class="header side-by-side">
                    <div class="">
                        {{ library.name }}
                        <div class="url">
                            {{ library.url }}
                        </div>
                    </div>
                    <div>
                    <ButtonSub v-if="library.url !== 'audio/samples.json'" @click="()=>deleteSampleLibrary(library.url)" tooltip="Delete a sample library">
                        ×
                    </ButtonSub>
                    </div>
                </div>
                <div class="error" v-if="library.error">{{ library.error }}</div>
                <div v-for="kit in library.content" class="kit">
                    {{ kit.name }}
                </div>
            </div>
        </div>
        <div class="actions">
            <div class="side-by-side">
                <input style="width: 237px; border: solid 1px;" type="text" v-model="newLibrary" />
                <Button @click="addSampleLibrary" tooltip="Add a sample library">
                    add +
                </Button>
            </div>
            <Button @click="externalSampleLibraries.resetValue" tooltip="Add a sample library">
                reset to default
            </Button>
        </div>
    </Collapsible>
</template>

    
<style scoped>
.side-by-side {
    display: flex;
    justify-content: space-between;
}
.contents-list .library {
    border-bottom: 1px solid #ccc;
}
.contents-list .library .header {
    background-color: #41709940;
    padding: 0.1em 0.7em;
}
.contents-list .library .url {
    text-align: right;
}
.contents-list .error {
    font-style: italic;
    padding-left: 1rem;
}
.contents-list .kit {
    padding-left: 1rem;
}
</style>