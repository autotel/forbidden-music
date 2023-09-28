import LZUTF8 from 'lzutf8';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Note, NoteDef, note } from '../dataTypes/Note';
import { Loop, LoopDef, loop } from '../dataTypes/Loop';
import { TimeRange, sanitizeTimeRanges } from '../dataTypes/TimelineItem';
import { getNotesInRange, getTracesInRange } from '../functions/getEventsInRange';
import { ifDev } from '../functions/isDev';
import { ExternalSynthInstance, SynthInstance, SynthParam } from '../synth/SynthInterface';
import { useLayerStore } from './layerStore';
import { LIBRARY_VERSION, LibraryItem } from './libraryStore';
import { SynthChannel, usePlaybackStore } from './playbackStore';
import { useSnapStore } from './snapStore';
import { useViewStore } from './viewStore';
import { Trace, TraceType, traceTypeSafetyCheck } from '../dataTypes/Trace';
import { useAudioContextStore } from './audioContextStore';

export const useProjectStore = defineStore("current project", () => {
    const layers = useLayerStore();
    const view = useViewStore();
    const snaps = useSnapStore();
    const edited = ref(Date.now().valueOf() as Number);
    const created = ref(Date.now().valueOf() as Number);
    const playbackStore = usePlaybackStore();
    const audioContextStore = useAudioContextStore();
    const name = ref("unnamed (autosave)" as string);

    const score = ref<Note[]>([]);
    const loops = ref<Loop[]>([]);

    const getSnapsList = (): LibraryItem["snaps"] => Object.keys(snaps.values).map((key) => {
        return [key, snaps.values[key].active];
    });

    const serializeNotes = (notes: Note[]) => notes.map((editNote) => ({
        octave: editNote.octave,
        time: editNote.time,
        timeEnd: editNote.timeEnd,
        mute: editNote.mute,
        velocity: editNote.velocity,
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

    const stringifyNotes = (notes: Note[], zip: boolean = false) => {
        let str = JSON.stringify(serializeNotes(notes));
        if (zip) str = LZUTF8.compress(str, { outputEncoding: "Base64" });
        return str;
    }


    const stringifyLoops = (loops: Loop[], zip: boolean = false) => {
        let str = JSON.stringify(serializeLoops(loops));
        if (zip) str = LZUTF8.compress(str, { outputEncoding: "Base64" });
        return str;
    }

    const parseNotes = (str: string): Note[] => {
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


        const editNotes = objNotes.map((maybeNote: unknown | NoteDef) => {
            if (typeof maybeNote !== "object") return false;
            if (null === maybeNote) return false;
            if (!('time' in maybeNote)) return false;
            if (!('timeEnd' in maybeNote)) return false;
            if (!('octave' in maybeNote)) return false;
            if (!('velocity' in maybeNote)) return false;
            if (!('mute' in maybeNote)) return false;
            if (!('layer' in maybeNote)) return false;

            return note({
                ...maybeNote as NoteDef,
            });
        }).filter((on: unknown) => on) as Note[];
        if (editNotes.length === 0) {
            console.log("no notes found in parsed text");
            return [];
        }
        sanitizeTimeRanges(...editNotes);
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

        objLoops = objLoops.map((maybeLoop: LoopDef) => loop(maybeLoop))
        sanitizeTimeRanges(...objLoops);
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


    const setFromListOfNoteDefinitions = (notes: NoteDef[]) => {
        console.log("setFromListOfNoteDefinitions", notes);
        score.value = notes.map((noteDef) => {
            const noteLayer = noteDef.layer || 0;
            layers.getOrMakeLayerWithIndex(noteLayer);
            return note(noteDef)
        });
    }

    const setFromProjectDefinition = (pDef: LibraryItem) => {
        console.log("setFromProjectDefinition", pDef);
        name.value = pDef.name;
        created.value = pDef.created;
        edited.value = pDef.edited;

        setFromListOfNoteDefinitions(pDef.notes);


        const nLoops: Loop[] = pDef.loops.map((loop: LoopDef) => {
            if (!('count' in loop)) {
                loop.count = Infinity;
            }
            if (('time' in loop) && ('timeEnd' in loop)) {
                return loop as unknown as Loop;
            }

            console.error("invalid loop definition", loop);
            return {
                time: 0,
                timeEnd: 0,
                count: 0,
            } as Loop;
        }).map(loop);

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
            await audioContextStore.audioContextPromise;
            pDef.channels.forEach(({ type, params }, index) => {
                playbackStore.setSynthByName(type, index).then((synth) => {
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

    const appendNote = (...notes: Note[]) => {
        score.value.push(...notes);
    }

    const append = (...traces: Trace[]) => {
        let nnotes = [] as Note[];
        let nloops = [] as Loop[];
        traces.forEach((trace) => {
            switch (trace.type) {
                case TraceType.Note:
                    nnotes.push(trace);
                    break;
                case TraceType.Loop:
                    nloops.push(trace);
                    break;
            }
        })
        appendNote(...nnotes);
        loops.value.push(...nloops);
    }

    const magicLoopDuplicator = (originalLoop: Loop) => {
        const notesInLoop = getNotesInRange(score.value, originalLoop).filter((note) => {
            // dont copy notes that started earlier bc. we are already copying notes that end after
            // also dont copy notes that start right at the end of originalLoop
            return note.time >= originalLoop.time && note.time < originalLoop.timeEnd
        });
        const notesAfterLoop = getNotesInRange(score.value, {
            time: originalLoop.timeEnd,
            timeEnd: Infinity,
        }).filter((note) => {
            return !notesInLoop.includes(note)
        });
        const loopsAfterLoop = loops.value.filter((otherLoop) => {
            return otherLoop.time >= originalLoop.timeEnd;
        });
        const loopLength = originalLoop.timeEnd - originalLoop.time;
        notesAfterLoop.forEach((note) => {
            note.time += loopLength;
        })
        loopsAfterLoop.forEach((originalLoop) => {
            console.log("shift originalLoop", originalLoop.time);
            originalLoop.time += loopLength;
            originalLoop.timeEnd += loopLength;
            console.log(" >> ", originalLoop.time);
        })

        // clone all notes in originalLoop
        score.value.push(...notesInLoop.map(note));

        notesInLoop.forEach((note) => {
            note.time += loopLength;
            note.timeEnd += loopLength;
        })
        
        loops.value.push(loop({
            time: originalLoop.time + loopLength,
            timeEnd: originalLoop.timeEnd + loopLength,
            count: originalLoop.count,
        }));

        if (originalLoop.count === Infinity) {
            originalLoop.count = 4;
            originalLoop.repetitionsLeft = 1;
        }

    }

    return {
        score, loops, append,
        name, edited, created, snaps,
        stringifyNotes, parseNotes,
        stringifyLoops, parseLoops,
        getProjectDefintion,
        setFromProjectDefinition, setFromListOfNoteDefinitions,
        clearScore, appendNote,
        magicLoopDuplicator,
    }

});