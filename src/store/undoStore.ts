import LZUTF8 from 'lzutf8';
import { defineStore } from 'pinia';
import { computed, nextTick, ref, watch, watchEffect } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { Note, makeNote } from '../dataTypes/Note.js';
import { SynthParam } from '../synth/SynthInterface.js';
import { useProjectStore } from './projectStore.js';
import { useScoreStore } from './scoreStore.js';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore.js';
import { useRefHistory, watchPausable } from '@vueuse/core';

export const useUndoStore = defineStore("undo history store", () => {
    const project = useProjectStore();
    const currentResumeTimeout = ref<NodeJS.Timeout | null>(null);

    const projectStateZipped = ref<string | null>(
        LZUTF8.compress(
            JSON.stringify(
                project.getProjectDefintion()
            )
        )
    );

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
            undoStateWriter.resume();
        }, 700);
        undoStateWriter.pause();
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

    const { history, undo, redo } = useRefHistory(projectStateZipped, {
        capacity: 15,
    });

    return {
        history, undo, redo,
    }

});