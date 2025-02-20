<script setup lang="ts">
import { onMounted, ref } from "vue";
import Button from "../components/Button.vue";
import FileOpen from "../components/icons/FileOpen.vue";
import Folder from "../components/icons/Folder.vue";
import Save from "../components/icons/Save.vue";
import SaveAs from "../components/icons/SaveAs.vue";
import isTauri, { ifTauri, tauriObject } from "../functions/isTauri";
import { KeyActions, getActionForKeys } from "../keyBindings";
import { useLibraryStore } from "../store/libraryStore";
import { useMonoModeInteraction } from "../store/monoModeInteraction";
import { useProjectStore } from "../store/projectStore";
import Collapsible from "./Collapsible.vue";
import { FileEntry } from "@tauri-apps/api/fs";

const monoModeInteraction = useMonoModeInteraction();
const project = useProjectStore();
const libraryStore = useLibraryStore();
const workingDirectory = ref<string>('./');
const filesOnWorkingDirectory = ref<FileEntry[]>([]);
const skipDotFiles = true;
const skipNotJSONFiles = true;
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

const downloadString = async (text: string, fileType: string, fileName: string) => {
    if (isTauri()) {
        console.log("saving through FS to", workingDirectory.value + "/" + project.name + ".json");
        const { fs } = await tauriObject();
        await fs.writeTextFile(workingDirectory.value + "/" + project.name + ".json", text);
    } else {
        console.log("saving as download");
        const blob = new Blob([text], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = project.name + ".json";
        a.click();
    }
}

const showJSONOpenDialog = () => {
    ifTauri(async (tauriPromise) => {
        const { fs, dialog, path } = await tauriPromise;
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
    ifTauri(async (tauriObjectPromise) => {
        const { fs, dialog, path } = await tauriObjectPromise;
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
    const json = JSON.stringify(libraryItem, null, 2);
    downloadString(json, "application/json", project.name + ".json").then(()=>{
        refreshDirList();
    })
}

const refreshDirList = () => {
    ifTauri(async (tauriPromise) => {
        const tauriResolved = await tauriPromise;
        const { fs, path } = tauriResolved;
        const dir = await fs.readDir(workingDirectory.value);
        filesOnWorkingDirectory.value = dir.filter((file) => {
            if (
                (skipDotFiles && file.name?.startsWith("."))
                || (skipNotJSONFiles && !file.children && !file.name?.endsWith(".json"))
            ) {
                return false;
            }
            return true;
        }).sort((a, b) => {
            if (a.children && !b.children) {
                return -1;
            }
            if (!a.children && b.children) {
                return 1;
            }
            return 0;
        });
    })
}

const goUpDir = () => {
    ifTauri(async (tauriPromise) => {
        const tauriResolved = await tauriPromise;
        const { path } = tauriResolved;
        workingDirectory.value = await path.dirname(workingDirectory.value);
        console.log("changed to ", workingDirectory.value);
        refreshDirList();
    })
}

const goInDir = (dir: FileEntry) => {
    ifTauri(async (tauriPromise) => {
        const tauriResolved = await tauriPromise;
        const { path } = tauriResolved;
        workingDirectory.value = dir.path;
        console.log("changed to ", workingDirectory.value);
        refreshDirList();
    })
}

const tryOpenProject = (path: FileEntry) => {
    ifTauri(async (tauriPromise) => {
        const tauriResolved = await tauriPromise;
        const { fs } = tauriResolved;
        try {
            const content = await fs.readTextFile(path.path);
            const parsedContent = JSON.parse(content);
            libraryStore.importObject(parsedContent);
            console.log("open JSON", path, content);
            const filenameWithoutJson = path.name?.replace(/\.json\b/, "");
            project.name = filenameWithoutJson || "unnamed";
        } catch (e) {
            alert(`Error opening file ${path}: ${e}`);
        }
    })
}

const fileClickHandler = (file: FileEntry) => {
    if (file.children) {
        goInDir(file);
    } else {
        tryOpenProject(file);
    }
}

onMounted(() => {
    ifTauri(async (tauriPromise) => {
        const tauriResolved = await tauriPromise;
        const { path } = tauriResolved;
        workingDirectory.value = await path.homeDir();
        console.log("changed to ", workingDirectory.value);
        refreshDirList();
    })
    refreshDirList();
})

</script>
<template>
    <Collapsible tooltip="Save to and load from your files, in text format">
        <template #icon>
            <Folder clas="icon" />
            Save and load
        </template>
        <small v-if="isTauri()">{{ workingDirectory + '/' }}</small>
        <small>{{ project.name }}.json</small>
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
        <div class="dirlist" v-if="isTauri()">
            <Button :onClick="goUpDir">
                ..
            </Button>
            <Button v-for="file in filesOnWorkingDirectory" :key="file.path" :onClick="() => fileClickHandler(file)"
                :class="{ 'dir': file.children }">
                <Folder v-if="file.children" />
                {{ file.name }}
            </Button>
        </div>

    </Collapsible>
</template>


<style>
input[type="file"] {
    display: none;
}

Button.dir {
    background-color: aliceblue;
}
</style>