import { useRefHistory, watchPausable } from '@vueuse/core';
import LZUTF8 from 'lzutf8';
import { defineStore } from 'pinia';
import { nextTick, ref } from 'vue';
import { useProjectStore } from './projectStore.js';

export const useUndoStore = defineStore("undo history store", () => {
    const project = useProjectStore();
    const currentResumeTimeout = ref<NodeJS.Timeout | null>(null);

    const projectStateZipped = ref<string | null>(null);

    const undoStateWriter = watchPausable(project.getProjectDefintion, () => {
        console.log("store to undo history");
        const json = JSON.stringify(project.getProjectDefintion());
        const zipped = LZUTF8.compress(json, { outputEncoding: "Base64" });
        undoApplicator.pause();
        projectStateZipped.value = zipped;
        nextTick(() => {
            undoApplicator.resume();
        });
        if(currentResumeTimeout.value) {
            clearTimeout(currentResumeTimeout.value);
        }
        currentResumeTimeout.value = setTimeout(() => {
            // undoStateWriter.resume();
            // TODO: insert new state after resuming, then increase timeout
        }, 500);
        // undoStateWriter.pause();
    });

    const undoApplicator = watchPausable(projectStateZipped, (zipped) => {
        undoStateWriter.pause();
        if(!zipped) {
            return console.log("undo history is empty");
        }
        console.log("apply from undo history");
        try {
            const json = LZUTF8.decompress(zipped, { inputEncoding: "Base64" });
            const pDef = JSON.parse(json) as ReturnType<typeof project.getProjectDefintion>;
            project.setFromProjecDefinition(pDef);
        } catch (e) {
            console.error("undo history seems to be corrupted");
            console.error(e);
        }
        nextTick(() => {
            undoStateWriter.resume();
        });
    });

    const { 
        history, 
        undoStack, redoStack,
        undo, redo, 
        canRedo, canUndo 
    } = useRefHistory(projectStateZipped, {
        capacity: 15,
    });

    return {
        history, undo, redo,
        undoStack, redoStack,
        canRedo, canUndo,
    }

});