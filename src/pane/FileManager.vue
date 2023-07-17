<script setup lang="ts">
import Button from "../components/Button.vue";
import Archive from "../components/icons/Archive.vue";
import Folder from "../components/icons/Folder.vue";
import Save from "../components/icons/Save.vue";
import FileOpen from "../components/icons/FileOpen.vue";
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

const monoModeInteraction = useMonoModeInteraction();
const project = useProjectStore();
const libraryStore = useLibraryStore();
const workingDirectory = ref<string>("Downloads");

const mainInteraction = monoModeInteraction.getInteractionModal("default");

const keyDownListener = (e: KeyboardEvent) => {

    if (e.target instanceof HTMLInputElement) {
        return;
    }
    const keyAction = getActionForKeys(e.key, e.ctrlKey, e.shiftKey, e.altKey);
    switch (keyAction) {
        case KeyActions.Save: {
            console.log("save");
            libraryStore.saveCurrent();
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.SaveAs: {
            console.log("save as");
            libraryStore.saveCurrent();
            e.preventDefault();
            e.stopPropagation();
            break;
        }
        case KeyActions.Download: {
            console.log("downloaded");
            showJSONSaveDialog();
            e.preventDefault();
            e.stopPropagation();
            break;
        }
    }
}


mainInteraction.addEventListener(window, 'keydown', keyDownListener);

const downloadString = (text: string, fileType: string, fileName: string) => {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = project.name + ".json";
    a.click();
}


const clear = () => {
    libraryStore.clear();
}

const showJSONOpenDialog = () => {
    ifTauri(async ({ fs, dialog, path }) => {
        const dialogOptions = {
            filters: [{ name: 'JSON', extensions: ['json'] }],
            defaultPath: workingDirectory.value ? workingDirectory.value : './',
            title: 'Import JSON',
        };
        const selected = await dialog.open(dialogOptions)
        if (selected) {
            const firstSelected = Array.isArray(selected) ? selected[0] : selected;
            try {
                const content = await fs.readTextFile(firstSelected);
                const parsedContent = JSON.parse(content);
                libraryStore.importObject(parsedContent);
                console.log("open JSON", firstSelected, content);
                workingDirectory.value = await path.dirname(firstSelected);
                project.name = await path.basename(firstSelected, ".json");
                console.log("update project name", workingDirectory.value, project.name);
            } catch (e) {
                alert(`Error opening file ${firstSelected}: ${e}`);
            }
        } else {
            console.log("no file selected", selected);
        }
    }).else(() => {
        let fileInput = document.getElementById('fileInput.JSONUpload') as HTMLInputElement;
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.id = 'fileInput.JSONUpload';
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.onchange = (evt: any) => {
                libraryStore.importJSONFileList(evt.target.files);
            }
        }
        fileInput.click();
    })
}

const showJSONSaveDialog = () => {
    ifTauri(async ({ fs, dialog, path }) => {
        const dialogOptions = {
            filters: [{ name: 'JSON', extensions: ['json'] }],
            defaultPath: workingDirectory.value ? workingDirectory.value : './',
            defaultFile: project.name + ".json",
            title: 'Export JSON',
        };
        const selected = await dialog.save(dialogOptions)
        if (selected) {
            const firstSelected = Array.isArray(selected) ? selected[0] : selected;
            const fileNameWithExtension = firstSelected.endsWith(".json") ? firstSelected : firstSelected + ".json";
            try {
                const libraryItem = project.getProjectDefintion();
                libraryItem.version = libraryStore.version;
                const json = JSON.stringify(libraryItem);
                await fs.writeFile({ path: fileNameWithExtension, contents: json });
                console.log("save JSON", fileNameWithExtension, json);
                workingDirectory.value = await path.dirname(fileNameWithExtension);
                project.name = await path.basename(fileNameWithExtension, ".json");
                console.log("update project name", workingDirectory.value, project.name);
            } catch (e) {
                alert(`Error saving file ${firstSelected}: ${e}`);
            }
        } else {
            console.log("no file selected", selected);
        }
    }).else(() => {
        download();
    })
}

const download = () => {
    const libraryItem = project.getProjectDefintion();
    libraryItem.version = libraryStore.version;
    const json = JSON.stringify(libraryItem);
    downloadString(json, "application/json", project.name + ".json");
}

</script>
<template>
    <Collapsible pulltip="save and load" title="file">
        <template #icon>
            <Folder clas="icon"/>
            Save and load
        </template>
        <small>{{ isTauri() ? workingDirectory : '' }}/{{ project.name }}.json</small>
        <br>
        <Button :onClick="() => download()" v-if="project.name"
            :tooltip="`save to local drive ${isTauri() ? workingDirectory : ''}/${project.name}.json`">
            <Save />
            <template slot="tooltip">
                {{ isTauri() ? "Save" : "Export" }} {{ project.name }}.json
            </template>
        </Button>
        <Button v-if="isTauri()" :onClick="() => showJSONSaveDialog()" tooltip="Save to local drive in new location">
            <SaveAs />
        </Button>
        <Button :onClick="showJSONOpenDialog" tooltip="Open JSON formatted file">
            <FileOpen />
        </Button>

    </Collapsible>
</template>

    
<style>
input[type="file"] {
    display: none;
}
</style>