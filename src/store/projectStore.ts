import { useThrottleFn } from '@vueuse/core';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { Group } from '../dataTypes/Group.js';
import { LibraryItem } from './libraryStore.js';
import { usePlaybackStore } from './playbackStore.js';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore.js';
import { NoteDefa, NoteDefb } from '../dataTypes/Note.js';
import { ParamType, SynthParam } from '../synth/SynthInterface.js';
import { useLayerStore } from './layerStore.js';

export const useProjectStore = defineStore("current project", () => {
    const layers = useLayerStore();
    const view = useViewStore();
    const snaps = useSnapStore();
    const edited = ref(Date.now().valueOf() as Number);
    const created = ref(Date.now().valueOf() as Number);
    const playbackStore = usePlaybackStore();
    const name = ref("unnamed (autosave)" as string);

    const groups = ref<Group[]>([]);
    const score = ref<EditNote[]>([]);

    const getUnusedGroupId = (): number => {
        let ret = 0;
        while (groups.value.find((group) => group.id === ret)) {
            ret++;
        }
        return ret;
    }
    const getNewGroup = (name = "new group"): Group => {
        // if groups array is a ref, it seems that group might be cloned into instead of being the same
        const index = groups.value.push(new Group(name));
        const newGroup = groups.value[index - 1];
        return newGroup
    }

    const getSnapsList = (): LibraryItem["snaps"] => Object.keys(snaps.values).map((key) => {
        return [key, snaps.values[key].active];
    });

    const getNotesInGroup = (group: Group): EditNote[] => {
        return score.value.filter((note) => note.group === group);
    }

    const getOrCreateGroupById = (id: number, extraProps: any): Group => {
        const groupList = groups.value;
        const found = groupList.find((group) => group.id === id);
        if (found) return found;
        const newGroup = getNewGroup();
        newGroup.id = id;
        Object.assign(newGroup, extraProps);
        groupList.push(newGroup);
        return newGroup;
    }

    const updateGroupBounds = useThrottleFn((group: Group) => {
        const notes = getNotesInGroup(group);
        if (notes.length === 0) {
            group.setBounds([0, 0], [0, 0]);
            return;
        }
        const start = Math.min(...notes.map((note) => note.time));
        const end = Math.max(...notes.map((note) => note.timeEnd));
        const octaveStart = Math.min(...notes.map((note) => note.octave));
        const octaveEnd = Math.max(...notes.map((note) => note.octave));
        group.setBounds([start, end], [octaveStart, octaveEnd]);
    }, 60, true, true);


    const getProjectDefintion = (): LibraryItem => {
        const ret = {
            name: name.value,
            notes: score.value.map((editNote) => ({
                frequency: editNote.frequency,
                time: editNote.time,
                duration: editNote.duration,
                mute: editNote.mute,
                velocity: editNote.velocity,
                groupId: editNote.group?.id || null,
                layer: editNote.layer,
            })),
            customOctavesTable: snaps.customOctavesTable,
            created: created.value,
            edited: edited.value,
            snaps: getSnapsList(),
            bpm: playbackStore.bpm,
            layers: layers.layers,
        } as LibraryItem;
        if (playbackStore.channels.length) {
            ret.channels = playbackStore.channels.map((channel) => ({
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

        pDef.layers.forEach(({channelSlot,visible,locked}, index) => {
            const layer = layers.getOrMakeLayerWithIndex(index);
            layer.visible = visible;
            layer.locked = locked;
            layer.channelSlot = channelSlot;
        });

        if(pDef.customOctavesTable) snaps.customOctavesTable = pDef.customOctavesTable;

        (async () => {
            await playbackStore.audioContextPromise;
            pDef.channels.forEach(({ type, params }, index) => {
                playbackStore.setSynthByName(type, index).then((synth) => {
                    params.forEach((param) => {
                        try {
                            const foundNamedParam = synth.params.find((synthParam) => {
                                return synthParam.displayName === param.displayName;
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
        groups.value = [];
    }

    const appendNote = (...notes: EditNote[]) => {
        score.value.push(...notes);
        let alreadyUpdatedGroups: Group[] = [];
        notes.map((note) => {
            if (!note.group) return;
            if (alreadyUpdatedGroups.includes(note.group)) return;
            alreadyUpdatedGroups.push(note.group);
            updateGroupBounds(note.group);
        })
    }

    const setNotesGroup = (notes: EditNote[], group: Group) => {
        notes.map((note) => {
            note.group = group;
        })
        updateGroupBounds(group);
    }

    const setNotesGroupToNewGroup = (notes: EditNote[]) => {
        const newGroup = getNewGroup();
        setNotesGroup(notes, newGroup);
    }

    return {
        score, groups,
        name, edited, created, snaps,
        getProjectDefintion,
        setFromProjectDefinition, setFromListOfNoteDefinitions, updateGroupBounds,
        getOrCreateGroupById, getNotesInGroup, setNotesGroup, setNotesGroupToNewGroup,
        clearScore, appendNote,
    }

});