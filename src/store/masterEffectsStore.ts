import { defineStore } from "pinia";
import { SynthChain } from "../dataStructures/SynthChain";
import { AudioModule } from "../synth/types/AudioModule";
import { useAudioContextStore } from "./audioContextStore";
import getSynthConstructors from "@/synth/getSynthConstructors";
import { useExclusiveContentsStore } from "./exclusiveContentsStore";
import { SynthChainDefinition, synthStructureManager } from "@/dataStructures/synthStructureFunctions";

type admissibleEffectTypes = AudioModule;


export const useMasterEffectsStore = defineStore('playback-effects', () => {
    const audioContextStore = useAudioContextStore();
    const effectsChain = new SynthChain(audioContextStore.audioContext);
    const myInput = effectsChain.input;
    const output = effectsChain.output;
    const exclusives = useExclusiveContentsStore();
    const synthConstructorWrappers = getSynthConstructors(audioContextStore.audioContext, exclusives.enabled);

    const addEffect = (effect: admissibleEffectTypes) => {
        effectsChain.addAudioModule(effectsChain.children.length, effect);
        effect.enable ? effect.enable() : undefined;
    }

    const removeEffect = (effect: admissibleEffectTypes) => {
        effectsChain.removeAudioModule(effect);
        effect.disable ? effect.disable() : undefined;
    }

    const synthStructure = synthStructureManager(
        audioContextStore.audioContext,
        synthConstructorWrappers
    );
    
    audioContextStore.audioContextPromise.then(() => {
        effectsChain.rewire();
        output.connect(audioContextStore.audioContext.destination);
    });

    const applyDefinition = (definition: SynthChainDefinition, recycle = false) => {
        console.log('Applying definition', definition, recycle);
        synthStructure.applyChainDefinition(
            effectsChain,
            definition,
            recycle
        );
    }

    const getDefinition = (): SynthChainDefinition => {
        return synthStructure.getDefinitionForChain(effectsChain);
    }

    return {
        myInput,
        effectsChain,
        addEffect,
        removeEffect,
        applyDefinition,
        getDefinition,
    }


});