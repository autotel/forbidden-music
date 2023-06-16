import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { Group, MaybeGroupedEditNote } from '../dataTypes/Group.js';
import { Note, NoteDefa, NoteDefb } from '../dataTypes/Note.js';
import { LibraryItem } from './libraryStore.js';
import { usePlaybackStore } from './playbackStore.js';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore.js';

export const useProjectStore = defineStore("current project", () => {
    const view = useViewStore();
    const snaps = useSnapStore();
    const edited = ref(Date.now().valueOf() as Number);
    const created = ref(Date.now().valueOf() as Number);
    const playbackStore = usePlaybackStore();
    const name = ref("unnamed (autosave)" as string);
    // TODO: later might use the main group names as a project name
    // opening the door to mixing projects
    const mainGroup = reactive(new Group("main"));

    const score = (reutilize = false): MaybeGroupedEditNote[] => mainGroup.getFlatNotes(reutilize)


    const getSnapsList = (): LibraryItem["snaps"] => Object.keys(snaps.values).map((key) => {
        return [key, snaps.values[key].active];
    });

    const getProjectDefintion = (): LibraryItem => {
        const ret = {
            name: name.value,
            notes: score().map((editNote) => ({
                frequency: editNote.frequency,
                start: editNote.start,
                duration: editNote.duration,
                mute: editNote.mute,
                groupId: editNote.group?.id || null,
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

    const setScore = (newScore: (NoteDefa | NoteDefb | EditNote | Note)[]) => {
        clearScore();
        mainGroup.notes = newScore.map(note => new EditNote(note, view));
    }

    const setFromProjecDefinition = (pDef: LibraryItem) => {
        name.value = pDef.name;
        created.value = pDef.created;
        edited.value = pDef.edited;
        setScore(pDef.notes);
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
        mainGroup.notes = [];
        mainGroup.groups = [];
    }

    const appendNote = (...notes: MaybeGroupedEditNote[]) => {
        notes.map((note) => {
            let destinationGroup = mainGroup;
            if (note.group) {
                destinationGroup = note.group;
            }
            destinationGroup.notes.push(note);
        });
    }

    const deleteNote = (...notes: MaybeGroupedEditNote[]) => {
        notes.map((note) => {
            let destinationGroup = mainGroup;
            if (note.group) {
                destinationGroup = note.group;
            }
            destinationGroup.notes = destinationGroup.notes.filter((n) => n !== note);
        })
    }

    return {
        score, mainGroup,
        name, edited, created, snaps,
        getProjectDefintion,
        setFromProjecDefinition,
        clearScore, setScore, appendNote, deleteNote,
    }

});