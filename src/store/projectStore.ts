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
const getUnusedGroupId = (groups: Group[]): number => {
    let ret = 0;
    while (groups.find((group) => group.id === ret)) {
        ret++;
    }
    return ret;
}
const getNewGroup = (groups: Group[], name = "new group"): Group => {
    return {
        name,
        id: getUnusedGroupId(groups),
        bounds: [[0, 0], [0, 0]],
        selected: false,
    }
}

export const useProjectStore = defineStore("current project", () => {



    const view = useViewStore();
    const snaps = useSnapStore();
    const edited = ref(Date.now().valueOf() as Number);
    const created = ref(Date.now().valueOf() as Number);
    const playbackStore = usePlaybackStore();
    const name = ref("unnamed (autosave)" as string);

    const groups = ref<Group[]>([
        getNewGroup([]),
    ]);

    const score = ref<EditNote[]>([]);

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
        const newGroup = getNewGroup(groupList);
        newGroup.id = id;
        Object.assign(newGroup, extraProps);
        groupList.push(newGroup);
        return newGroup;
    }

    const updateGroupBounds = useThrottleFn((group: Group) => {
        const notes = getNotesInGroup(group);
        if (notes.length === 0) {
            group.bounds = [[0, 0], [0, 0]];
            return;
        }
        const start = Math.min(...notes.map((note) => note.start));
        const end = Math.max(...notes.map((note) => note.end));
        const octaveStart = Math.min(...notes.map((note) => note.octave));
        const octaveEnd = Math.max(...notes.map((note) => note.octave));
        group.bounds = [[start, end], [octaveStart, octaveEnd]];
    }, 100);


    const getProjectDefintion = (): LibraryItem => {
        const ret = {
            name: name.value,
            notes: score.value.map((editNote) => ({
                frequency: editNote.frequency,
                start: editNote.start,
                duration: editNote.duration,
                mute: editNote.mute,
                // groupId: editNote.group?.id || null,
            })),
            created: created.value,
            edited: edited.value,
            snaps: getSnapsList(),
            bpm: playbackStore.bpm,
        } as LibraryItem;
        if (playbackStore.synth) {
            ret.instrument = {
                type: playbackStore.synth.name,
                params: playbackStore.synth.params.map(param => ({
                    displayName: param.displayName,
                    value: param.value,
                }))
            }
        }
        return ret;
    }


    const setFromListOfNoteDefinitions = (notes: (NoteDefa | NoteDefb)[]) => {
        score.value = notes.map((note) => new EditNote(note, view));
    }

    const setFromProjecDefinition = (pDef: LibraryItem) => {
        name.value = pDef.name;
        created.value = pDef.created;
        edited.value = pDef.edited;

        setFromListOfNoteDefinitions(pDef.notes);
        // const loadedGroups = score.value.map(({ group }) => group).filter((group) => group) as Group[];
        // loadedGroups.map((g) => getOrCreateGroupById(g.id, g)) as Group[];

        if (pDef.bpm) playbackStore.bpm = pDef.bpm;

        console.log(pDef.notes.filter(note => note.mute))
        if (pDef.instrument) {
            playbackStore.setSynthByName(pDef.instrument.type).then((synth) => {
                pDef.instrument?.params.forEach((param, index) => {
                    const foundNamedParam = synth.params.find((synthParam) => {
                        return synthParam.displayName === param.displayName;
                    })
                    if (foundNamedParam) {
                        foundNamedParam.value = param.value;
                        console.log("import param", param.displayName, param.value);
                    } else {
                        console.warn(`ignoring imported param ${param.displayName} in synth ${synth.name}`);
                    }
                });
            })

        }

        pDef.snaps.forEach(([name, activeState]) => {
            if (!snaps.values[name]) return;
            snaps.values[name].active = activeState;
        });
    }

    const clearScore = () => {
        score.value = [];
        groups.value = [];
    }

    const appendNote = (...notes: EditNote[]) => {
        score.value.push(...notes);
        
        
        notes.map((note) => {
            // TODO: remove, its for dev purposes
            note.group = getOrCreateGroupById(0, { name: "test group" });
            if (!note.group) return;
            updateGroupBounds(note.group);
        })
    }

    return {
        score, groups,
        name, edited, created, snaps,
        getProjectDefintion,
        setFromProjecDefinition,setFromListOfNoteDefinitions,
        clearScore, appendNote,
    }

});