import LZUTF8 from 'lzutf8';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { EditNote } from '../dataTypes/EditNote.js';
import { NoteDefa, NoteDefb } from '../dataTypes/Note.js';
import { TimeRange } from '../dataTypes/TimelineItem.js';
import { getNotesInRange } from '../functions/getNotesInRange.js';
import { ifDev } from '../functions/isDev.js';
import { SynthInstance, SynthParam } from '../synth/SynthInterface.js';
import { useLayerStore } from './layerStore.js';
import { LIBRARY_VERSION, LibraryItem } from './libraryStore.js';
import { SynthChannel, usePlaybackStore } from './playbackStore.js';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore.js';
import { RefSymbol } from '@vue/reactivity';

export interface Loop extends TimeRange {
    count: number;
    repetitionsLeft?: number;
}

export interface LoopDef extends TimeRange {
    count?: number;
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

    const serializeLoops = (loops: Loop[]): LoopDef[] => loops.filter(
        l => ((l.timeEnd - l.time > 0) && (l.count > 0))
    ).map((loop) => {
        const ret: LoopDef = {
            time: loop.time,
            timeEnd: loop.timeEnd,
            count: loop.count,
        };
        if (loop.count === Infinity) delete ret.count;
        return ret;
    });

    const stringifyNotes = (notes: EditNote[], zip: boolean = false) => {
        let str = JSON.stringify(serializeNotes(notes));
        if (zip) str = LZUTF8.compress(str, { outputEncoding: "Base64" });
        return str;
    }


    const stringifyLoops = (loops: Loop[], zip: boolean = false) => {
        let str = JSON.stringify(serializeLoops(loops));
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

    const parseLoops = (str: string): Loop[] => {
        let json = str;
        let objLoops = [];

        try {
            objLoops = JSON.parse(str);
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
            objLoops = JSON.parse(json);
        } catch (_e) {
            ifDev(() => console.log("cannot be parsed, giving up"));
            return [];
        }

        objLoops.forEach((loop: { [key: string]: number | string }) => {
            if (!('count' in loop)) {
                loop.count = Infinity;
            }
        })

        return objLoops
    }

    const getProjectDefintion = (): LibraryItem => {
        const ret = {
            name: name.value,
            notes: serializeNotes(score.value),
            loops: serializeLoops(loops.value),
            customOctavesTable: snaps.customOctavesTable,
            snap_simplify: snaps.simplify,
            created: created.value,
            edited: edited.value,
            snaps: getSnapsList(),
            bpm: playbackStore.bpm,
            layers: layers.layers,
            channels: [],
            version: LIBRARY_VERSION,
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


        const nLoops = pDef.loops.map((loop: LoopDef) => {
            if (!('count' in loop)) {
                loop.count = Infinity;
            }
            if (('time' in loop) && ('timeEnd' in loop)) {
                return loop as unknown as Loop;
            }
            console.error("invalid loop definition", loop);
            return { time: 0, timeEnd: 0, count: 0 }
        })

        loops.value = nLoops;

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
                playbackStore.setSynthByName(type, index).then((synth: SynthInstance) => {
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
        loops.value = [];
    }

    const appendNote = (...notes: EditNote[]) => {
        score.value.push(...notes);
    }

    const magicLoopDuplicator = (loop: Loop) => {
        const notesInLoop = getNotesInRange(score.value, loop).filter((note) => {
            // dont copy notes that started earlier bc. we are already copying notes that end after
            return note.time > loop.time;
        });
        const notesAfterLoop = getNotesInRange(score.value, {
            time: loop.timeEnd,
            timeEnd: Infinity,
        }).filter((note) => {
            return !notesInLoop.includes(note)
        });
        const loopsAfterLoop = loops.value.filter((otherLoop) => {
            return otherLoop.time >= loop.timeEnd;
        });
        const loopLength = loop.timeEnd - loop.time;
        notesAfterLoop.forEach((note) => {
            note.time += loopLength;
        })
        loopsAfterLoop.forEach((loop) => {
            console.log("shift loop",loop.time);
            loop.time += loopLength;
            loop.timeEnd += loopLength;
            console.log(" >> ",loop.time);
        })
        score.value.push(...notesInLoop.map((note) => note.clone()));
        notesInLoop.forEach((note) => {
            note.time += loopLength;
        })
        loops.value.push({
            time: loop.time + loopLength,
            timeEnd: loop.timeEnd + loopLength,
            count: loop.count,
        });
        if (loop.count === Infinity) {
            loop.count = 4;
            loop.repetitionsLeft = 1;
        }
        
    }

    return {
        score, loops,
        name, edited, created, snaps,
        stringifyNotes, parseNotes,
        stringifyLoops, parseLoops,
        getProjectDefintion,
        setFromProjectDefinition, setFromListOfNoteDefinitions,
        clearScore, appendNote,
        magicLoopDuplicator,
    }

});