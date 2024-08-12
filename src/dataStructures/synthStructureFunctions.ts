import { PatcheableType } from "../dataTypes/PatcheableTrait";
import { abbreviate } from "../functions/abbreviate";
import { useAutomationLaneStore } from "../store/automationLanesStore";
import { AudioModule } from "../synth/types/AudioModule";
import { SynthParam, SynthParamStored, isValidParam } from "../synth/types/SynthParam";
import { Synth, PatcheableSynthVoice } from "../synth/types/Synth";
import { SynthChain } from "./SynthChain";
import { SynthStack } from "./SynthStack";

type EitherAccessible = AudioModule | SynthChain | SynthStack | SynthParam | undefined;

export type AdmissibleSynthType = AudioModule | Synth | PatcheableSynthVoice;

/** storage for export/save, etc definitions */
export type AudioModuleDefinition = {
    type: string;
    params: Array<SynthParamStored>;
}
export type SynthChainDefinition = SynthChainStepDefinition[];
export type SynthStackDefinition = SynthChainDefinition[];
export type SynthChainStepDefinition = AudioModuleDefinition | SynthStackDefinition;
export type SynthChannelsDefinition = SynthStackDefinition;

export interface SynthConstructorIdentifier {
    name: string;
    create: (withParams?: SynthParamStored[]) => AdmissibleSynthType;
}
export const synthStructureManager = <ConstId extends SynthConstructorIdentifier>(
    audioContext: AudioContext,
    synthFactories: ConstId[]
) => {
    const automationStore = useAutomationLaneStore();

    const applyChainDefinition = (
        targetChain: SynthChain,
        definition: SynthChainDefinition,
        recycle = false
    ) => {
        console.log("applying chain definition", definition);
        if (targetChain === undefined) throw new Error("target chain is undefined");
        if (!recycle) {
            targetChain.setAudioModules([]);
        }
        definition.forEach((chainStep: SynthChainStepDefinition, i) => {
            if (Array.isArray(chainStep)) {
                // it's a stack
                let stackInstance: SynthStack | undefined = undefined;
                if (recycle && targetChain.children[i] instanceof SynthStack) {
                    stackInstance = targetChain.children[i] as SynthStack;
                    console.log("recycling", stackInstance.name);
                }
                const stackDef: SynthStackDefinition = chainStep;
                if (!stackInstance) {
                    if (recycle) console.warn("recyclable stack not found in ", targetChain.children, "step", i, "described as", chainStep);
                    stackInstance = new SynthStack(audioContext);
                    targetChain.addAudioModule(i, stackInstance);
                }
                applyStackDefinition(stackInstance, stackDef, recycle);
            } else {
                // It's an audio module
                let synth: AdmissibleSynthType | undefined = undefined;

                if (recycle && targetChain.children[i] && targetChain.children[i].name === chainStep.type) {
                    synth = targetChain.children[i] as AudioModule;
                    console.log("recycling", synth.name);
                }

                if (!synth) {
                    if (recycle) console.warn(
                        "recyclable synth not found in ", [...targetChain.children],
                        "step", i,
                        "described as", chainStep,
                        "not matching", targetChain.children[i]?.name, chainStep.type
                    );
                    let synthFactory = synthFactories.find((s) => s.name === chainStep.type);
                    if (!synthFactory) {
                        const regex = new RegExp(chainStep.type.slice(0, 3));
                        const loosely = synthFactories.find((s) => s.name.match(regex));
                        if (loosely) {
                            console.warn("synth named", chainStep.type, "not found, looking for similarly named: ", loosely?.name);
                            synthFactory = loosely;
                        }
                    }
                    if (!synthFactory) {
                        console.warn("synth not found", chainStep.type);
                        synthFactory = synthFactories[0];
                    }

                    const paramsDef = chainStep.params;
                    synth = synthFactory.create(paramsDef);
                    targetChain.addAudioModule(i, synth);
                }


            }
        });
    }

    const applyStackDefinition = (stack: SynthStack, definition: SynthStackDefinition, recycle = false) => {
        // TODO: replace foreach with for loop
        definition.forEach((chainDef: SynthChainDefinition, i) => {
            let chainInstance: SynthChain | undefined = undefined;
            if (recycle && stack.children[i] instanceof SynthChain) {
                chainInstance = stack.children[i] as SynthChain;
                console.log("recycling", chainInstance.name);
            }
            if (!chainInstance) {
                if (recycle) console.warn("recyclable chain not found in ", stack.children, "step", i, "described as", chainDef);
                chainInstance = stack.addChain();
            }
            applyChainDefinition(chainInstance, chainDef, recycle);
        });
    }

    const applyChannelsDefinition = (
        targetStack: SynthStack,
        definition: SynthChannelsDefinition,
        recycle = false
    ) => {

        console.group("applying channels definition", definition);
        if (recycle) {
            console.log("recycling synths");
        } else {
            targetStack.empty();
        }
        definition.forEach((chainDef, i) => {
            console.log("loading channel chain", chainDef);
            let chainInstance: SynthChain | undefined = undefined;
            if (recycle && targetStack.children[i] instanceof SynthChain) {
                chainInstance = targetStack.children[i] as SynthChain;
                console.log("recycling", chainInstance.name);
            }
            if (!chainInstance) {
                if (recycle) console.warn("recyclable chain not found in ", targetStack.children, "step", i, "described as", chainDef);
                chainInstance = targetStack.addChain();
            }
            applyChainDefinition(chainInstance, chainDef, recycle);
        });
        console.groupEnd();
    }

    const getDefinitionForAudioModule = (synth: AudioModule): AudioModuleDefinition => {
        let params = synth.params.filter((param: SynthParam) => {
            return param.exportable;
        }).map((param: SynthParam) => {
            const isAutomated = automationStore.isParameterAutomated(param);
            const ret = {
                value: isAutomated ? 0 : param.value,
            } as SynthParamStored
            if (param.displayName) {
                ret.displayName = param.displayName;
            }
            return ret;
        }) as SynthParamStored[]
        return {
            type: synth.name || "unknown",
            params
        }
    }

    const getDefinitionForChain = (fromChain: SynthChain): SynthChainDefinition => {
        return fromChain.children.map((step) => {
            if (step instanceof SynthStack) {
                return getDefinitionForStack(step);
            }
            if (step.patcheableType === PatcheableType.AudioModule) {
                const audioModule = step as AudioModule;
                return getDefinitionForAudioModule(audioModule);
            }
            console.error("no method to get definition for ", step);
            return [];
        })
    }

    const getDefinitionForStack = (stack: SynthStack): SynthStackDefinition => {
        return stack.children.map((chain) => {
            return getDefinitionForChain(chain);
        });
    }

    const accessorStringToSynthParam = (accessorString: string, container: EitherAccessible): SynthParam | undefined => {
        if (!accessorString) return undefined;
        const accessorParts = accessorString.split(".");
        let recAccumulator = container as EitherAccessible
        recursionLoop: for (let i = 0; i < accessorParts.length; i++) {
            const part = accessorParts[i];
            const partAsNumber = parseInt(part);
            switch (true) {
                case recAccumulator instanceof SynthChain: {
                    recAccumulator = (recAccumulator as SynthChain).children[partAsNumber] as SynthChain;
                    break;
                }
                case recAccumulator instanceof SynthStack: {
                    recAccumulator = (recAccumulator as SynthStack).children[partAsNumber] as SynthChain;
                    break;
                }
                case recAccumulator instanceof AudioModule || recAccumulator instanceof Synth: {
                    const audioModule = recAccumulator as AudioModule;
                    recAccumulator = audioModule.findParamByName(part);
                    break recursionLoop
                }
                default: {
                    console.error(
                        "could not find parameter accessed by ",
                        accessorString,
                        "at",
                        accessorParts.slice(0, i).join("."),
                        recAccumulator
                    );
                    recAccumulator = undefined;
                }
            }
            if (recAccumulator === undefined) {
                return undefined;
            }
        }
        if (isValidParam(recAccumulator)) {
            return recAccumulator;
        } else {
            console.error("Tried to get synth param, but access didn't lead to parameter, but this instead:", recAccumulator);
        }
    }


    return {
        applyChainDefinition,
        applyStackDefinition,
        applyChannelsDefinition,
        getDefinitionForAudioModule,
        getDefinitionForChain,
        getDefinitionForStack,
        accessorStringToSynthParam
    }
}

export type SynthStructureManager = ReturnType<typeof synthStructureManager>;