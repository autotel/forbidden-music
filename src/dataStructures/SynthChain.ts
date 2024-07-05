import { PATCHING_MAX_DEPTH } from "../consts/PatchingMaxDepth";
import { PatcheableTrait, PatcheableType } from "../dataTypes/PatcheableTrait";
import { ReceivesNotes } from "../synth/types/AudioModule";
import { SynthStack } from "./SynthStack";
export type ChainStep = PatcheableTrait;
const getNoteReceivers = (
    modules: (ChainStep | SynthChain | SynthStack)[],
    recursionDepth = 0,
): ReceivesNotes[] => {
    if (recursionDepth > PATCHING_MAX_DEPTH) {
        throw new Error("chain recursion depth exceeded");
    }
    return modules.reduce((acc, chainItem) => {
        if ('receivesNotes' in chainItem && chainItem.receivesNotes === true) {
            // It's an ordinary audio module
            const receivesNotes = chainItem as ReceivesNotes;
            acc.push(receivesNotes);
        } else if (chainItem instanceof SynthChain) {
            // it's a synth chain 
            acc.push(...getNoteReceivers(chainItem.children, recursionDepth + 1));
        } else if (chainItem instanceof SynthStack) {
            // It's a parallel stack of audio modules, recurse
            const subReceivers: ReceivesNotes[] = [];
            chainItem.children.forEach(chain => subReceivers.push(
                ...getNoteReceivers(chain.children, recursionDepth + 1))
            );
            acc.push(...subReceivers);
        } else {
            // console.error("unexpected chain item", chainItem);
        }
        return acc;
    }, [] as ReceivesNotes[]);
}

export class SynthChain implements PatcheableTrait {
    name = "SynthChain";
    readonly chainStepType = PatcheableType.SynthChain;
    output: GainNode;
    input: GainNode;
    children: ChainStep[] = [];
    chainChangedEventListeners = new Set<() => void>();
    readonly patcheableType = PatcheableType.SynthChain;
    readonly enable = false;
    readonly disable = false;

    constructor(audioContext: AudioContext) {
        this.output = audioContext.createGain();
        this.input = audioContext.createGain();
    }
    handleChanged = () => {
        console.log("children changed");
        this.rewire();
        this.chainChangedEventListeners.forEach(listener => listener());
    }
    addChangeListener = (listener: () => void) => {
        this.chainChangedEventListeners.add(listener);
    }
    removeChangeListener = (listener: () => void) => {
        this.chainChangedEventListeners.delete(listener);
    }
    removeChangeListeners = () => {
        this.chainChangedEventListeners.clear();
    }
    rewire = (recursion = 0) => {
        if (recursion > PATCHING_MAX_DEPTH) {
            throw new Error("children recursion depth exceeded");
        }
        this.input.disconnect();
        let prevModule: PatcheableTrait | undefined;
        if (this.children.length === 0) {
            this.input.connect(this.output);
            return;
        }
        for (let step of this.children) {
            if (step instanceof SynthStack) {
                step.rewire(recursion + 1);
            }
            if (step instanceof SynthChain) {
                step.rewire(recursion + 1);
            }
            if (step.output) {
                step.output.disconnect();
            }
            if (step.input) {
                if (!prevModule) {
                    this.input.connect(step.input);
                } else if (prevModule.output) {
                    prevModule.output.connect(step.input);
                }
            }
            prevModule = step;
        }
        if (prevModule && prevModule.output) {
            prevModule.output.connect(this.output);
        }
    }
    getNoteReceivers = () => {
        return getNoteReceivers(this.children);
    }
    addAudioModule = (position: number, newModule: PatcheableTrait) => {
        this.children.splice(position, 0, newModule);
        this.rewire();
        this.handleChanged();
    }
    setAudioModules = (modules: PatcheableTrait[]) => {
        this.children = modules;
        this.rewire();
        this.handleChanged();
    }
    replaceAudioModule = (
        removedModule: ChainStep,
        newModule: ChainStep,
    ) => {
        const index = this.children.indexOf(removedModule);
        if (index === -1) {
            console.warn("module not found in children");
            return;
        }
        removedModule.disable ? removedModule.disable() : undefined;
        this.children.splice(index, 1);
        this.children.splice(index, 0, newModule);
        this.rewire();
        this.handleChanged();
    }
    removeAudioModule = (step: ChainStep) => {
        const index = this.children.indexOf(step);
        if (index === -1) {
            console.warn("module not found in children", this.children, step);
            return;
        }
        this.removeAudioModuleAt(index);
    }
    removeAudioModuleAt = (index: number) => {
        const step = this.children[index];
        step.disable ? step.disable() : undefined;
        this.children.splice(index, 1);
        this.rewire();
        this.handleChanged();
    }
    releaseAll = () => {
        this.getNoteReceivers().forEach(receiver => receiver.scheduleEnd());
    }

}