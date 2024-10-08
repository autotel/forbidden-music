import { compress, decompress } from 'lzutf8';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { LIBRARY_VERSION, LibraryItem } from '../dataTypes/LibraryItem';
import { Note, NoteDef, note, noteDef } from '../dataTypes/Note';
import { sanitizeTimeRanges } from '../dataTypes/TimelineItem';
import { Trace, TraceType, transposeTime } from '../dataTypes/Trace';
import { getNotesInRange } from '../functions/getEventsInRange';
import { ifDev } from '../functions/isDev';
import { useAudioContextStore } from './audioContextStore';
import { useAutomationLaneStore } from './automationLanesStore';
import { useLayerStore } from './layerStore';
import { normalizeLibraryItem } from './libraryStore';
import { usePlaybackStore } from './playbackStore';
import demoProject from './project-default';
import { useSnapStore } from './snapStore';
import { useSynthStore } from './synthStore';
import { AUTOSAVE_PROJECTNAME } from '../consts/ProjectName';
import { useMasterEffectsStore } from './masterEffectsStore';
import { automationPoint, AutomationPoint } from '@/dataTypes/AutomationPoint';
import { tryDecompressAndParseArray } from '@/functions/tryDecompressAndParseArray';
import { useLoopsStore } from './loopsStore';
import { Loop } from '@/dataTypes/Loop';

const emptyProjectDefinition: LibraryItem = {
    name: AUTOSAVE_PROJECTNAME,
    notes: [],
    loops: [],
    lanes: [],
    created: Date.now().valueOf(),
    edited: Date.now().valueOf(),
    snaps: [],
    bpm: 120,
    layers: [],
    channels: [[]],
    masterEffects: [],
    version: LIBRARY_VERSION,
};

export const useProjectStore = defineStore("current project", () => {
    const layers = useLayerStore();
    const snaps = useSnapStore();
    const loops = useLoopsStore();
    const edited = ref(Date.now().valueOf() as Number);
    const created = ref(Date.now().valueOf() as Number);
    const playback = usePlaybackStore();
    const synths = useSynthStore();
    const masterEffects = useMasterEffectsStore();
    const audioContextStore = useAudioContextStore();
    const name = ref(AUTOSAVE_PROJECTNAME);
    

    const notes = ref<Note[]>([]);
    const lanes = useAutomationLaneStore();

    const getSnapsList = (): LibraryItem["snaps"] => Object.entries(snaps.values).map(([key, value]) => {
        return [key, value.active];
    });

    const serializeNotes = (notes: Note[]) => notes.map(noteDef);

    const stringifyNotes = (notes: Note[], zip: boolean = false) => {
        let str = JSON.stringify(serializeNotes(notes));
        if (zip) str = compress(str, { outputEncoding: "Base64" });
        return str;
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


    const getProjectDefintion = (): LibraryItem => {
        const ret = {
            name: name.value,
            notes: serializeNotes(notes.value),
            loops: loops.serialize(),
            lanes: lanes.getAutomationLaneDefs(),
            customOctavesTable: snaps.customOctavesTable,
            snap_simplify: snaps.simplify,
            created: created.value,
            edited: edited.value,
            snaps: getSnapsList(),
            bpm: playback.bpm,
            layers: layers.layers,
            channels: [],
            masterEffects: masterEffects.getDefinition(),
            version: LIBRARY_VERSION,
        } as LibraryItem;
        ret.version = LIBRARY_VERSION;
        if (synths.channels.children.length) {
            ret.channels = synths.getCurrentChannelsDefinition();
        }
        return ret;
    }

    const setFromProjectDefinition = (pDef: LibraryItem, recycleSynths = false) => {
        name.value = pDef.name;
        
        created.value = pDef.created;
        edited.value = pDef.edited;

        notes.value = pDef.notes.map(note);
        notes.value.forEach((note) => {
            layers.getOrMakeLayerWithIndex(note.layer);
        });

        loops.setFromDefs(pDef.loops);

        if (pDef.bpm) playback.bpm = pDef.bpm;

        pDef.snaps.forEach(([name, activeState]) => {
            if (!(name in snaps.values)) return;
            // @ts-ignore
            snaps.values[name].active = activeState;
        });


        layers.clear();
        pDef.layers.forEach(({ channelSlot, visible, locked, name }, index) => {
            const layer = layers.getOrMakeLayerWithIndex(index);
            layer.visible = visible;
            layer.locked = locked;
            layer.channelSlot = channelSlot;
            if (name) {
                layer.name = name;
            }else{
                delete layer.name;
            }
        });


        if (pDef.customOctavesTable) snaps.customOctavesTable = pDef.customOctavesTable;
        if (pDef.snap_simplify) snaps.simplify = pDef.snap_simplify;

        (async () => {
            await audioContextStore.audioContextPromise;
            synths.applyChannelsDefinition(pDef.channels, recycleSynths);
            lanes.applyAutomationLaneDefs(pDef.lanes);
            masterEffects.applyDefinition(pDef.masterEffects, recycleSynths);
        })();


    }

    const clearScore = () => {
        notes.value = [];
        loops.clear();
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
        loops.append(...nloops);
    }



    const loadEmptyProjectDefinition = () => {
        setFromProjectDefinition(emptyProjectDefinition);
    }


    const loadDemoProjectDefinition = () => {
        setFromProjectDefinition(normalizeLibraryItem(demoProject));
    }

    return {
        notes, loops, lanes, synths,
        append,
        loadEmptyProjectDefinition,
        loadDemoProjectDefinition,
        name, edited, created, snaps,
        stringifyNotes, parseNotes,
        getProjectDefintion,
        setFromProjectDefinition,
        clearScore, appendNote,
    }

});