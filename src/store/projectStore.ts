import { compress, decompress } from 'lzutf8';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Loop, LoopDef, loop, loopDef } from '../dataTypes/Loop';
import { Note, NoteDef, note, noteDef } from '../dataTypes/Note';
import { sanitizeTimeRanges } from '../dataTypes/TimelineItem';
import { Trace, TraceType, transposeTime } from '../dataTypes/Trace';
import { getNotesInRange } from '../functions/getEventsInRange';
import { ifDev } from '../functions/isDev';
import { useAudioContextStore } from './audioContextStore';
import { useAutomationLaneStore } from './automationLanesStore';
import { useLayerStore } from './layerStore';
import { LIBRARY_VERSION, LibraryItem } from '../dataTypes/LibraryItem';
import { usePlaybackStore } from './playbackStore';
import { useSnapStore } from './snapStore';
import { normalizeLibraryItem } from './libraryStore';
import { useSynthStore } from './synthStore';
import demoProject from './project-default';
import { SynthParam, SynthParamStored } from '../synth/interfaces/SynthParam';

const emptyProjectDefinition: LibraryItem = {
    name: "unnamed (autosave)",
    notes: [],
    loops: [],
    lanes: [],
    created: Date.now().valueOf(),
    edited: Date.now().valueOf(),
    snaps: [],
    bpm: 120,
    layers: [],
    channels: [{
        chain: [{
            type: "sine",
            params: [{
                displayName: "volume",
                value: 0.8,
            }],
        }]
    }],
    version: LIBRARY_VERSION,
};

export const useProjectStore = defineStore("current project", () => {
    const layers = useLayerStore();
    const snaps = useSnapStore();
    const edited = ref(Date.now().valueOf() as Number);
    const created = ref(Date.now().valueOf() as Number);
    const playback = usePlaybackStore();
    const synth = useSynthStore();
    const audioContextStore = useAudioContextStore();
    const name = ref("unnamed (autosave)" as string);

    const notes = ref<Note[]>([]);
    const loops = ref<Loop[]>([]);
    const lanes = useAutomationLaneStore();

    const getSnapsList = (): LibraryItem["snaps"] => Object.entries(snaps.values).map(([key, value]) => {
        return [key, value.active];
    });

    const sortLoops = () => {
        loops.value.sort((a, b) => {
            return a.time - b.time;
        });
    }

    const serializeNotes = (notes: Note[]) => notes.map(noteDef);

    const serializeLoops = (loops: Loop[]) => loops.filter(
        l => ((l.timeEnd - l.time > 0) && (l.count > 0))
    ).map(loopDef);

    const stringifyNotes = (notes: Note[], zip: boolean = false) => {
        let str = JSON.stringify(serializeNotes(notes));
        if (zip) str = compress(str, { outputEncoding: "Base64" });
        return str;
    }

    const stringifyLoops = (loops: Loop[], zip: boolean = false) => {
        let str = JSON.stringify(serializeLoops(loops));
        if (zip) str = compress(str, { outputEncoding: "Base64" });
        return str;
    }

    type ItmFilter<T> = (itm: unknown | T) => boolean;
    const tryDecompressAndParseArray = <T>(str: string, testFn: ItmFilter<T>): T[] => {
        let json = str;
        try {
            json = decompress(str, { inputEncoding: "Base64" });
        } catch (_e) {
            ifDev(() => console.log("cannot be decompressed"));
            return [];
        }

        try {
            const parsed = JSON.parse(json);
            if (!('length' in parsed)) {
                console.warn("invalid notes string", str);
                return [];
            } else {
                return parsed.filter(testFn) as T[];
            }
        } catch (_e) {
            ifDev(() => console.log("cannot be parsed"));
            return [];
        }
    }

    const parseNotes = (str: string): Note[] => {
        let noteDefs = tryDecompressAndParseArray<NoteDef>(str, (maybeNote) => {
            if (typeof maybeNote !== "object") return false;
            if (null === maybeNote) return false;
            if (!('time' in maybeNote)) return false;
            if (!('timeEnd' in maybeNote || 'duration' in maybeNote)) return false;
            if (!('octave' in maybeNote)) return false;
            if (!('velocity' in maybeNote)) return false;
            if (!('mute' in maybeNote)) return false;
            if (!('layer' in maybeNote)) return false;
            return true
        });

        const editNotes = noteDefs.map(note);

        if (editNotes.length === 0) {
            console.log("no notes found in parsed text");
            return [];
        }

        sanitizeTimeRanges(...editNotes);
        return editNotes;
    }

    const parseLoops = (str: string): Loop[] => {
        let loopDefs = tryDecompressAndParseArray<LoopDef>(str, (maybeLoop) => {
            if (typeof maybeLoop !== "object") return false;
            if (null === maybeLoop) return false;
            if (!('timeEnd' in maybeLoop)) return false;
            if (!('time' in maybeLoop)) return false;
            if (!('count' in maybeLoop)) return false;
            return true;
        });
        const loops = loopDefs.map(loop)
        sanitizeTimeRanges(...loops);
        return loops;
    }

    const getProjectDefintion = (): LibraryItem => {
        const ret = {
            name: name.value,
            notes: serializeNotes(notes.value),
            loops: serializeLoops(loops.value),
            lanes: lanes.getAutomationLaneDefs(),
            customOctavesTable: snaps.customOctavesTable,
            snap_simplify: snaps.simplify,
            created: created.value,
            edited: edited.value,
            snaps: getSnapsList(),
            bpm: playback.bpm,
            layers: layers.layers,
            channels: [],
            version: LIBRARY_VERSION,
        } as LibraryItem;
        ret.version = LIBRARY_VERSION;
        if (synth.channels.chains.length) {
            ret.channels = synth.getCurrentChannelsDefinition();
        }
        return ret;
    }

    const setFromProjectDefinition = (pDef: LibraryItem) => {
        name.value = pDef.name;
        created.value = pDef.created;
        edited.value = pDef.edited;

        notes.value = pDef.notes.map(note);
        notes.value.forEach((note) => {
            layers.getOrMakeLayerWithIndex(note.layer);
        });

        const nLoops: Loop[] = pDef.loops.map(loop);
        loops.value = nLoops;

        if (pDef.bpm) playback.bpm = pDef.bpm;

        pDef.snaps.forEach(([name, activeState]) => {
            if (!(name in snaps.values)) return;
            // @ts-ignore
            snaps.values[name].active = activeState;
        });


        layers.clear();
        pDef.layers.forEach(({ channelSlot, visible, locked }, index) => {
            const layer = layers.getOrMakeLayerWithIndex(index);
            layer.visible = visible;
            layer.locked = locked;
            layer.channelSlot = channelSlot;
        });

        lanes.applyAutomationLaneDefs(pDef.lanes);

        if (pDef.customOctavesTable) snaps.customOctavesTable = pDef.customOctavesTable;
        if (pDef.snap_simplify) snaps.simplify = pDef.snap_simplify;

        (async () => {
            await audioContextStore.audioContextPromise;
            synth.applyChannelsDefinition(pDef.channels);
            pDef.channels.forEach(({ chain }) => chain.forEach((step, index) => {
                console.warn("not loading parameters yet!!");
            }))

        })();

    }

    const clearScore = () => {
        notes.value = [];
        loops.value = [];
        lanes.clear();
        layers.clear();
        setFromProjectDefinition(emptyProjectDefinition);
    }

    const appendNote = (...newNotes: Note[]) => {
        notes.value.push(...newNotes);
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
        const notesInLoop = getNotesInRange(notes.value, originalLoop).filter((note) => {
            // dont copy notes that started earlier bc. we are already copying notes that end after
            // also dont copy notes that start right at the end of originalLoop
            return note.time >= originalLoop.time && note.time < originalLoop.timeEnd
        });
        const notesAfterLoop = getNotesInRange(notes.value, {
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
            transposeTime(note, loopLength);
        })
        loopsAfterLoop.forEach((originalLoop) => {
            console.log("shift originalLoop", originalLoop.time);
            originalLoop.time += loopLength;
            originalLoop.timeEnd += loopLength;
            console.log(" >> ", originalLoop.time);
        })

        // clone all notes in originalLoop
        notes.value.push(...notesInLoop.map(note));

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


    const loadEmptyProjectDefinition = () => {
        setFromProjectDefinition(emptyProjectDefinition);
    }


    const loadDemoProjectDefinition = () => {
        setFromProjectDefinition(normalizeLibraryItem(demoProject));
    }

    return {
        notes, loops, lanes,
        append,
        sortLoops,
        loadEmptyProjectDefinition,
        loadDemoProjectDefinition,
        name, edited, created, snaps,
        stringifyNotes, parseNotes,
        stringifyLoops, parseLoops,
        getProjectDefintion,
        setFromProjectDefinition,
        clearScore, appendNote,
        magicLoopDuplicator,
    }

});