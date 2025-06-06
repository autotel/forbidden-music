import { useRefHistory, watchPausable } from '@vueuse/core';
import { compress, decompress } from 'lzutf8';
import { defineStore } from 'pinia';
import { nextTick, ref } from 'vue';
import { useProjectStore } from './projectStore.js';
import { usePlaybackStore } from './playbackStore.js';

export const useHistoryStore = defineStore("undo history store", () => {
    const project = useProjectStore();
    const currentResumeTimeout = ref<NodeJS.Timeout | null>(null);
    const projectStateZipped = ref<string | null>(null);
    const lazyProjectDefinitionZipped = ref<string | null>(null);
    const playback = usePlaybackStore();
    setInterval(() => {
        const json = JSON.stringify(project.getProjectDefintion());
        const zipped = compress(json, { outputEncoding: "Base64" });
        if (zipped !== lazyProjectDefinitionZipped.value) {
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
            const currentPlaybackPosition = playback.currentScoreTime;
            const json = decompress(zipped, { inputEncoding: "Base64" });
            const pDef = JSON.parse(json) as ReturnType<typeof project.getProjectDefintion>;
            project.setFromProjectDefinition(pDef, true);
            // Otherwise, when undoing, playback exits the loop
            playback.stop();
            playback.currentScoreTime = currentPlaybackPosition;
            playback.play();
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