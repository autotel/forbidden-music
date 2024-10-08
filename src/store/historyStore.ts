import { useRefHistory, watchPausable } from '@vueuse/core';
import LZUTF8 from 'lzutf8';
import { defineStore } from 'pinia';
import { nextTick, ref } from 'vue';
import { useProjectStore } from './projectStore.js';

export const useHistoryStore = defineStore("undo history store", () => {
    const project = useProjectStore();
    const currentResumeTimeout = ref<NodeJS.Timeout | null>(null);
    const projectStateZipped = ref<string | null>(null);
    const lazyProjectDefinitionZipped = ref<string | null>(null);

    setInterval(() => {
        const json = JSON.stringify(project.getProjectDefintion());
        if(LZUTF8 === undefined) throw new Error("LZUTF8 is undefined");
        const zipped = LZUTF8.compress(json, { outputEncoding: "Base64" });
        if (zipped !== lazyProjectDefinitionZipped.value) {
            console.log("store to undo history");
            lazyProjectDefinitionZipped.value = zipped;
        }
    }, 1000);

    const unpauseRightAway = (t = 1) => {
        if (currentResumeTimeout.value) {
            clearTimeout(currentResumeTimeout.value);
        }
        currentResumeTimeout.value = setTimeout(() => {
            undoStateWriter.resume();
        }, t);
    }

    const undoStateWriter = watchPausable(lazyProjectDefinitionZipped, () => {
        // so that it stores fewer steps
        undoStateWriter.pause();
        // console.log("store to undo history");
        //////
        undoApplicator.pause();
        projectStateZipped.value = lazyProjectDefinitionZipped.value;
        nextTick(() => {
            undoApplicator.resume();
        });
        unpauseRightAway(500);
    });

    const undoApplicator = watchPausable(projectStateZipped, (zipped) => {
        undoStateWriter.pause();
        if (!zipped) {
            return console.log("undo history is empty");
        }
        console.log("apply from undo history");
        try {
            const json = LZUTF8.decompress(zipped, { inputEncoding: "Base64" });
            const pDef = JSON.parse(json) as ReturnType<typeof project.getProjectDefintion>;
            project.setFromProjectDefinition(pDef, true);
        } catch (e) {
            console.error("undo history seems to be corrupted");
            console.error(e);
        }
        unpauseRightAway();
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