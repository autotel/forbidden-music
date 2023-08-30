import { useThrottleFn } from '@vueuse/core';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { Group } from '../dataTypes/Group.js';
import { LibraryItem } from './libraryStore.js';
import { SynthChannel, usePlaybackStore } from './playbackStore.js';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore.js';
import { NoteDefa, NoteDefb } from '../dataTypes/Note.js';
import { ParamType, SynthInstance, SynthParam } from '../synth/SynthInterface.js';
import { useLayerStore } from './layerStore.js';
import LZUTF8 from 'lzutf8';
import { ifDev } from '../functions/isDev.js';
import { TimeRange } from '../dataTypes/TimelineItem.js';

export interface Loop extends TimeRange {
    count: number;
    repetitionsLeft?: number;
}

export const useProjectStore = defineStore("current project", () => {
    const layers = useLayerStore();
    const view = useViewStore();
    const snaps = useSnapStore();
    const edited = ref(Date.now().valueOf() as Number);
    const created = ref(Date.now().valueOf() as Number);
    const playbackStore = usePlaybackStore();
    const name = ref("unnamed (autosave)" as string);

    const score = ref<EditNote[]>([]);
    const loops = ref<Loop[]>([]);

    const getSnapsList = (): LibraryItem["snaps"] => Object.keys(snaps.values).map((key) => {
        return [key, snaps.values[key].active];
    });

    const serializeNotes = (notes: EditNote[]) => notes.map((editNote) => ({
        frequency: editNote.frequency,
        time: editNote.time,
        duration: editNote.duration,
        mute: editNote.mute,
        velocity: editNote.velocity,
        groupId: editNote.group?.id || null,
        layer: editNote.layer,
    }))

    const stringifyNotes = (notes: EditNote[], zip: boolean = false) => {
        let str = JSON.stringify(serializeNotes(notes));
        if (zip) str = LZUTF8.compress(str, { outputEncoding: "Base64" });
        return str;
    }

    const parseNotes = (str: string): EditNote[] => {
        let json = str;
        let objNotes = [];

        try {
            objNotes = JSON.parse(str);
        } catch (_e) {
            ifDev(() => console.log("cannot be parsed, trying to decompress"));
            try {
                json = LZUTF8.decompress(str, { inputEncoding: "Base64" });
            } catch (_e) {
                ifDev(() => console.log("cannot be decompressed"));
                return [];
            }
        }

        try {
            objNotes = JSON.parse(json);
        } catch (_e) {
            ifDev(() => console.log("cannot be parsed, giving up"));
            return [];
        }


        const editNotes = objNotes.map((maybeNote: unknown | NoteDefa | NoteDefb) => {
            if (
                (
                    (maybeNote as NoteDefa).octave || (maybeNote as NoteDefb).frequency
                ) && (maybeNote as NoteDefa).time
            ) {
                const n = new EditNote(maybeNote as NoteDefa, view);
                return n;
            }
            return false;
        }).filter((on: unknown) => on) as EditNote[];
        if (editNotes.length === 0) {
            console.log("no notes found in parsed text");
            return [];
        }
        return editNotes;
    }

    const getProjectDefintion = (): LibraryItem => {
        const ret = {
            name: name.value,
            notes: serializeNotes(score.value),
            customOctavesTable: snaps.customOctavesTable,
            snap_simplify: snaps.simplify,
            created: created.value,
            edited: edited.value,
            snaps: getSnapsList(),
            bpm: playbackStore.bpm,
            layers: layers.layers,
        } as LibraryItem;
        if (playbackStore.channels.length) {
            ret.channels = playbackStore.channels.map((channel: SynthChannel) => ({
                type: channel.synth.name,
                params: channel.params.filter((param: SynthParam) => {
                    return param.exportable;
                }).map((param: SynthParam) => ({
                    displayName: param.displayName,
                    value: param.value,
                }))
            }));
        }
        return ret;
    }


    const setFromListOfNoteDefinitions = (notes: (NoteDefa | NoteDefb)[]) => {
        console.log("setFromListOfNoteDefinitions", notes);
        score.value = notes.map((note) => {
            const noteLayer = note.layer || 0;
            layers.getOrMakeLayerWithIndex(noteLayer);
            return new EditNote(note, view)
        });
    }

    const setFromProjectDefinition = (pDef: LibraryItem) => {
        console.log("setFromProjectDefinition", pDef);
        name.value = pDef.name;
        created.value = pDef.created;
        edited.value = pDef.edited;

        setFromListOfNoteDefinitions(pDef.notes);

        if (pDef.bpm) playbackStore.bpm = pDef.bpm;

        pDef.snaps.forEach(([name, activeState]) => {
            if (!snaps.values[name]) return;
            snaps.values[name].active = activeState;
        });

        pDef.layers.forEach(({ channelSlot, visible, locked }, index) => {
            const layer = layers.getOrMakeLayerWithIndex(index);
            layer.visible = visible;
            layer.locked = locked;
            layer.channelSlot = channelSlot;
        });

        if (pDef.customOctavesTable) snaps.customOctavesTable = pDef.customOctavesTable;
        if (pDef.snap_simplify) snaps.simplify = pDef.snap_simplify;

        (async () => {
            await playbackStore.audioContextPromise;
            pDef.channels.forEach(({ type, params }, index) => {
                playbackStore.setSynthByName(type, index).then((synth:SynthInstance) => {
                    params.forEach((param) => {
                        try {
                            const foundNamedParam = synth.params.find(({ displayName }) => {
                                return displayName === param.displayName;
                            })
                            if (foundNamedParam) {
                                foundNamedParam.value = param.value;
                                console.log("import param", param.displayName, param.value);
                            } else {
                                console.warn(`ignoring imported param ${param.displayName} in synth ${synth.name}`);
                            }
                        } catch (e) {
                            console.warn(`error importing param "${param.displayName}" in synth "${synth.name}"`, e);
                        }
                    });
                })
            });

        })();

    }

    const clearScore = () => {
        score.value = [];
        loops.value = [{
            time: 2,
            timeEnd: 4,
            count: 4,
        },{
            time: 4,
            timeEnd: 6,
            count: 4,
        }];
    }

    const appendNote = (...notes: EditNote[]) => {
        score.value.push(...notes);
        let alreadyUpdatedGroups: Group[] = [];
        notes.map((note) => {
            if (!note.group) return;
            if (alreadyUpdatedGroups.includes(note.group)) return;
            alreadyUpdatedGroups.push(note.group);
        })
    }


    return {
        score, loops,
        name, edited, created, snaps,
        stringifyNotes, parseNotes,
        getProjectDefintion,
        setFromProjectDefinition, setFromListOfNoteDefinitions,
        clearScore, appendNote,
    }

});