import { Loop } from '@/dataTypes/Loop';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { AUTOSAVE_PROJECTNAME } from '../consts/ProjectName';
import { LIBRARY_VERSION, LibraryItem } from '../dataTypes/LibraryItem';
import { Note } from '../dataTypes/Note';
import { Trace, TraceType } from '../dataTypes/Trace';
import { useAudioContextStore } from './audioContextStore';
import { useAutomationLaneStore } from './automationLanesStore';
import { useLayerStore } from './layerStore';
import { normalizeLibraryItem } from './libraryStore';
import { useLoopsStore } from './loopsStore';
import { useMasterEffectsStore } from './masterEffectsStore';
import { useNotesStore } from './notesStore';
import { usePlaybackStore } from './playbackStore';
import demoProject from './project-default';
import { useSnapStore } from './snapStore';
import { useSynthStore } from './synthStore';
import { useCustomOctavesTableStore } from './customOctavesTableStore';

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
    const customOctaves = useCustomOctavesTableStore();
    const masterEffects = useMasterEffectsStore();
    const audioContextStore = useAudioContextStore();
    const name = ref(AUTOSAVE_PROJECTNAME);
    const notes = useNotesStore();
    const lanes = useAutomationLaneStore();

    const getSnapsList = (): LibraryItem["snaps"] => Object.entries(snaps.values).map(([key, value]) => {
        return [key, value.active];
    });

    const getProjectDefintion = (): LibraryItem => {
        const ret = {
            name: name.value,
            notes: notes.serialize(),
            loops: loops.serialize(),
            lanes: lanes.getAutomationLaneDefs(),
            customOctavesTable: customOctaves.table,
            customEDO: snaps.customEDO,
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
        notes.setFromDefs(pDef.notes);
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


        if (pDef.customOctavesTable) {
            customOctaves.frequenciesMode = false;
            customOctaves.setOctaves = pDef.customOctavesTable;
        }
        if (pDef.customEDO) snaps.customEDO = pDef.customEDO;
        if (pDef.snap_simplify) snaps.simplify = pDef.snap_simplify;

        (async () => {
            await audioContextStore.audioContextPromise;
            synths.applyChannelsDefinition(pDef.channels, recycleSynths);
            lanes.applyAutomationLaneDefs(pDef.lanes);
            masterEffects.applyDefinition(pDef.masterEffects, recycleSynths);
        })();


    }

    const clearScore = () => {
        notes.clear();
        loops.clear();
        lanes.clear();
        layers.clear();
        setFromProjectDefinition(emptyProjectDefinition);
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
        notes.append(...nnotes);
        loops.append(...nloops);
    }



    const loadEmptyProjectDefinition = () => {
        setFromProjectDefinition(emptyProjectDefinition);
    }
    
    const loadDemoProjectDefinition = () => {
        console.log("loading demo project");
        setFromProjectDefinition(normalizeLibraryItem(demoProject));
    }

    return {
        notes, loops, lanes, synths,
        append,
        loadEmptyProjectDefinition,
        loadDemoProjectDefinition,
        name, edited, created, snaps,
        getProjectDefintion,
        setFromProjectDefinition,
        clearScore,
    }

});