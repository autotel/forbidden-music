
import getSynthConstructors, { SynthConstructorWrapper } from '@/synth/getSynthConstructors';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { SynthChain } from '../dataStructures/SynthChain';
import { SynthStack } from '../dataStructures/SynthStack';
import { SynthChannelsDefinition, synthStructureManager } from '../dataStructures/synthStructureFunctions';
import { AutomationPoint } from '../dataTypes/AutomationPoint';
import { Note, getFrequency } from "../dataTypes/Note";
import isTauri, { tauriObject } from '../functions/isTauri';
import { PlaceholderSynth } from '../synth/generators/PlaceholderSynth';
import { ReceivesNotes } from '../synth/types/AudioModule';
import { SynthParam } from '../synth/types/SynthParam';
import { useAudioContextStore } from "./audioContextStore";
import { useExclusiveContentsStore } from './exclusiveContentsStore';
import { useLayerStore } from "./layerStore";
import { useMasterEffectsStore } from "./masterEffectsStore";

export const useSynthStore = defineStore("synthesizers", () => {
    const layerStore = useLayerStore();
    const exclusives = useExclusiveContentsStore();
    const audioContextStore = useAudioContextStore();
    const masterEffectsStore = useMasterEffectsStore();
    const synthConstructorWrappers = getSynthConstructors(
        audioContextStore.audioContext,
        exclusives.enabled
    );

    const channels = ref<SynthStack>(new SynthStack(audioContextStore.audioContext));

    channels.value.output.connect(masterEffectsStore.myInput);

    const scheduleNote = (
        event: Note,
        eventStartAbsolute: number,
        eventDuration?: number,
    ) => {
        const synths = getLayerSynths(event.layer);
        if (!synths.length) return;
        const frequency = getFrequency(event);
        synths.forEach(synth => {
            if (synth instanceof PlaceholderSynth) return;
            if (eventDuration) {
                synth.scheduleStart(
                    frequency,
                    eventStartAbsolute,
                    event
                ).scheduleEnd(eventStartAbsolute + eventDuration);
            } else {
                synth.schedulePerc(
                    frequency,
                    eventStartAbsolute,
                    event
                );

            }
        })
    }

    const scheduleAutomation = (
        event: AutomationPoint,
        detinationTime: number,
        destinationParameter: SynthParam,
    ) => {
        if (!destinationParameter.animate) throw new Error("destination parameter is not animatable");
        destinationParameter.animate(event.value, detinationTime);
    }

    const releaseAll = () => channels.value.children.forEach((chain) => chain.releaseAll());

    const instanceAudioModule = (audioModule: SynthConstructorWrapper) => {
        const newModule = audioModule.create();
        // to reduce traffic
        const enable = newModule.enable;
        if (enable) {
            if ('needsFetching' in newModule) {
                console.log("newModule needs fetching");
                if (exclusives.enabled) {
                    enable();
                } else {
                    setTimeout(() => {
                        enable();
                    }, 5000);
                }
            } else {
                enable();
            }
        }
        return newModule;
    }

    const synthStructure = synthStructureManager(
        audioContextStore.audioContext,
        synthConstructorWrappers
    );

    const applyChannelsDefinition = (inChannels: SynthChannelsDefinition, recycle = false) => {
        synthStructure.applyChannelsDefinition(
            channels.value,
            inChannels,
            recycle
        );
    }

    const getCurrentChannelsDefinition = (): SynthChannelsDefinition => {
        return synthStructure.getDefinitionForStack(channels.value);
    }

    const accessorStringToSynthParam = (accessorString: string): SynthParam | undefined => {
        return synthStructure.accessorStringToSynthParam(accessorString, channels.value);
    }


    /**
     * resolve assoc of
     * layer -> channels -> synth
     * falls back to default channel synth 0
     * 
     * could be memoized (it's called on every single trigger evt)
     */
    const getLayerSynths = (layerNo: number): ReceivesNotes[] => {
        const channelNo = layerStore.layers[layerNo]?.channelSlot as number | undefined;
        const channelIfExists = channels.value.children[channelNo || 0] as SynthChain | undefined;
        if (!channelIfExists) {
            return channels.value.children[0]?.getNoteReceivers() || [];
        }
        return channelIfExists.getNoteReceivers();
    }

    channels.value.addChain().name = "Default Channel";

    return {
        synthConstructorWrappers,
        channels,
        getCurrentChannelsDefinition,
        scheduleNote,
        scheduleAutomation,
        releaseAll,
        getLayerSynths,
        applyChannelsDefinition,
        instanceAudioModule,
        accessorStringToSynthParam,
        testBeep: async () => {
            !isTauri() && console.warn("beep only works in tauri");
            const { invoke } = await tauriObject();
            await invoke("trigger", {
                frequency: 80 + 440 * Math.pow(2, Math.random()),
                amplitude: 1,
            });
            console.log("beeped");
        }

    }
});