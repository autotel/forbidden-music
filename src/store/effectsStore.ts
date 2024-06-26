import { defineStore } from "pinia";
import { ConvolutionReverbEffect } from "../synth/ConvolutionReverbEffect";
import { AutoMaximizerEffect } from "../synth/AutoMaximizerEffect";
import { useAudioContextStore } from "./audioContextStore";
import { watch } from "vue";
import sampleDefinitions from "../_autogenerated_impulse_responses";
import { useCustomSettingsStore } from "./customSettingsStore";
import { EffectInstance } from "../synth/interfaces/AudioModule";

type admissibleEffectTypes = EffectInstance;

const availableEffectConstructors = [
    ConvolutionReverbEffect, AutoMaximizerEffect
];

export const useEffectsStore = defineStore('playback-effects', () => {
    const audioContextStore = useAudioContextStore();
    const userSettingsStore = useCustomSettingsStore();

    const myInput = audioContextStore.audioContext.createGain();
    const output = audioContextStore.audioContext.destination;
    const effectsChain = [] as admissibleEffectTypes[];

    const reconnectChain = () => {
        myInput.disconnect();
        let lastNode: AudioNode = myInput;
        for (let effect of effectsChain) {
            lastNode.disconnect();
            lastNode.connect(effect.inputNode);
            lastNode = effect.output;
        }
        lastNode.connect(output);
    }

    const addEffect = (effect: admissibleEffectTypes) => {
        effectsChain.push(effect);
        effect.enable();
        reconnectChain();
    }

    const removeEffect = (effect: admissibleEffectTypes) => {
        const indexOfEffect = effectsChain.indexOf(effect);
        if(indexOfEffect === -1) {
            throw new Error("Effect not found in chain");
        }
        effectsChain.splice(indexOfEffect, 1);
        effect.disable();
        reconnectChain();
    }

    const emptyEffectsChain = () => {
        effectsChain.length = 0;
        reconnectChain();
    }

    // stufff to do while fx are experimental and not stored feature


    const activateEffects = () => {
        audioContextStore.audioContextPromise.then(() => {
            if (effectsChain.length === 0) {
                addEffect(new AutoMaximizerEffect(audioContextStore.audioContext));
                addEffect(new ConvolutionReverbEffect(
                    audioContextStore.audioContext,
                    sampleDefinitions.flat()
                ));
            }
        });
    }

    const deactivateEffects = () => {
        emptyEffectsChain();
    }

    watch(() => userSettingsStore.effectsEnabled, (value) => {
        if (value) {
            activateEffects();
        } else {
            deactivateEffects();
        }
        console.log("effects enabled", value, effectsChain);
    });

    // actually this is in order to have the settings loaded
    // at time of evaluation. might aswell used a timeout
    // best would be to have an settings-loaded promise
    audioContextStore.audioContextPromise.then(() => {
        if(userSettingsStore.effectsEnabled) {
            activateEffects();
        }else{
            deactivateEffects();
        }
    });


    return {
        myInput,
        effectsChain,
        addEffect,
        removeEffect,
    }


});