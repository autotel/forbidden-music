import isDev, { ifDev } from "@/functions/isDev";
import { AutoMaximizerEffect } from "./effects/AutoMaximizerEffect";
import { ConvolutionReverbEffect } from "./effects/ConvolutionReverbEffect";
import { FilterEffect } from "./effects/FilterEffect";
import { GainEffect } from "./effects/GainEffect";
import { RingModEffect } from "./effects/RingModEffect";
import { DelayEffect } from "./effects/DelayEffect";
import { ExternalMidiSynth } from "./generators/ExternalMidiSynth";
import { FmSynth } from "./generators/FmSynth";
import { FourierSynth } from "./generators/FourierSynth";
import { GranularSampler } from "./generators/GranularSampler";
import { KarplusSynth } from "./generators/KarplusSynth";
import { KickSynth } from "./generators/KickSynth";
import { PatcheableSynth } from "./generators/PatcheableSynth";
import { PerxThingy } from "./generators/PerxThingy";
import { PlaceholderSynth } from "./generators/PlaceholderSynth";
import { Sampler } from "./generators/Sampler";
import { SineCluster } from "./generators/SineCluster";
import { SineSynth } from "./generators/SineSynth";
import { ThingyScoreFx } from "./scoreEffects/Thingy";
import { AudioModule } from "./types/AudioModule";
import { SynthParamStored } from "./types/SynthParam";
import { WaveFolderEffect } from "./effects/WaveFoldEffect";
import { ClassicSynth } from "./generators/ClassicSynth";
import { OscilloScope } from "./scope/OscilloScope";
import { FilterBankSynth } from "./generators/FilterBankSynth";
import { camelCaseToUName } from "@/functions/caseConverters";
import { SampleKitDefinition } from "@/dataTypes/SampleKitDefinition";

type SynthMinimalConstructor = new (audioContext: AudioContext, ...p: any) => (AudioModule);

export enum AudioModuleType {
    Sound = 'Sound',
    Effect = 'Effect',
    Scope = 'Scope',
}


export class SynthConstructorWrapper {
    constructor(
        public audioContext: AudioContext,
        public constructorFunction: SynthMinimalConstructor,
        public extraParams: unknown[] = [],
        public name: string,
        public type: AudioModuleType,
        public instantFetch?: boolean,
    ) { }
    create = (withParams?: SynthParamStored[]): AudioModule => {
        const instance = new this.constructorFunction(this.audioContext, ...this.extraParams);
        instance.name = this.name;

        const afterCreation = () => {
            if (instance instanceof AudioModule && withParams) {
                ifDev(() => console.log("setting params", withParams));
                for (let paramDef of withParams) {
                    const synthParam = paramDef.displayName ? instance.findParamByName(paramDef.displayName) : undefined;
                    if (!synthParam) {
                        console.error("param not found", paramDef.displayName, instance);
                        continue;
                    }
                    synthParam.value = paramDef.value;
                }
            }
        }

        // to reduce traffic
        const enable = instance.enable;

        if ('needsFetching' in instance) {
            console.log("instance needs fetching");
            if (this.instantFetch) {
                enable()
            } else {
                setTimeout(() => {
                    enable()
                }, 5000);
            }
        } else {
            enable()
        }

        instance.waitReady.then(afterCreation);

        return instance;
    }
}


export default function getSynthConstructors(
    audioContext: AudioContext,
    exclusivesMode: boolean,
): SynthConstructorWrapper[] {
    let returnArray = [] as SynthConstructorWrapper[];

    const addAvailableSynth = <T extends any[]>(
        constr: SynthMinimalConstructor,
        name: string,
        type: AudioModuleType,
        extraParams?: T,
        isExclusive?: boolean,
        isOnlyLocal?: boolean,
    ) => {
        const epp = (extraParams || []) as T;
        if (isExclusive && !exclusivesMode) return;
        if (isOnlyLocal && !isDev()) return;
        returnArray.push(
            new SynthConstructorWrapper(
                audioContext, constr, epp,
                name || camelCaseToUName(constr.name),
                type,
                exclusivesMode
            )
        );
    }

    addAvailableSynth(SineSynth, 'SineSynth', AudioModuleType.Sound);
    addAvailableSynth(SineCluster, 'SineCluster', AudioModuleType.Sound);
    // addAvailableSynth(PlaceholderSynth, 'PlaceholderSynth', AudioModuleType.Sound);
    addAvailableSynth(Sampler, "Chromatic Sampler", AudioModuleType.Sound);
    addAvailableSynth(GranularSampler, "Granular Sampler", AudioModuleType.Sound);
    // TODO: homologate choice of impulse response w methods on chromatic sampler
    addAvailableSynth(
        ConvolutionReverbEffect,
        "Convolver/Reverb",
        AudioModuleType.Effect,
        [{
            "name": "AC30 Brilliant",
            "fromLibrary": "AC30-brilliant-SNB",
            "pathBase": "./",
            "type": "impulse-response",
            "loadFrom": "file",
            "samples": [
                {
                    "kitName": "AC30 Brilliant",
                    "path": "./AC30-brilliant-SNB/AC30 brilliant bx44 neve close_dc.wav",
                    "name": "AC30 brilliant bx44 neve close_dc.wav"
                },
            ]
        }], true, false
    );

    addAvailableSynth(KickSynth, 'KickSynth', AudioModuleType.Sound);
    addAvailableSynth(KarplusSynth, 'KarplusSynth', AudioModuleType.Sound);
    addAvailableSynth(ClassicSynth, 'ClassicSynth', AudioModuleType.Sound);
    addAvailableSynth(FourierSynth, "Fourier Synth", AudioModuleType.Sound, [], false, false);

    addAvailableSynth(OscilloScope, 'Oscilloscope', AudioModuleType.Scope);

    addAvailableSynth(DelayEffect, 'DelayEffect',AudioModuleType.Effect);
    addAvailableSynth(RingModEffect, 'RingModEffect',AudioModuleType.Effect);
    addAvailableSynth(AutoMaximizerEffect, 'AutoMaximizerEffect',AudioModuleType.Effect);
    addAvailableSynth(FilterEffect, 'FilterEffect',AudioModuleType.Effect);
    addAvailableSynth(GainEffect, 'GainEffect',AudioModuleType.Effect);
    addAvailableSynth(WaveFolderEffect, 'WaveFolderEffect',AudioModuleType.Effect);

    if (isDev()) {
        // bc. unfinished
        addAvailableSynth(FmSynth, "(xp) Fm Synth", AudioModuleType.Sound, [], false, true);
        addAvailableSynth(ThingyScoreFx, "(xp) Thingy Score Effect", AudioModuleType.Sound);
        addAvailableSynth(ExternalMidiSynth, "(xp) External  [],Midi Synth", AudioModuleType.Sound);

        addAvailableSynth(PerxThingy, 'PerxThingy', AudioModuleType.Sound);
        addAvailableSynth(PatcheableSynth, "(xp) Dyna synth", AudioModuleType.Sound, [], false, true);
        addAvailableSynth(FilterBankSynth, "(xp) Filter Bank Synth", AudioModuleType.Sound, [], false, true);
    }


    return returnArray;
}