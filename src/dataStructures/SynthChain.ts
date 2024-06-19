import { PatcheableTrait, PatcheableType } from "../dataTypes/PatcheableTrait";
import { ReceivesNotes } from "../synth/interfaces/AudioModule";
import { MAX_RECURSION, SynthStack } from "./SynthStack";
export type ChainStep = PatcheableTrait;
const getNoteReceivers = (
    modules: (ChainStep | SynthChain | SynthStack)[],
    recursionDepth = 0,
): ReceivesNotes[] => {
    if (recursionDepth > MAX_RECURSION) {
        throw new Error("chain recursion depth exceeded");
    }
    return modules.reduce((acc, chainItem) => {
        if ('receivesNotes' in chainItem && chainItem.receivesNotes === true) {
            // It's an ordinary audio module
            const receivesNotes = chainItem as ReceivesNotes;
            acc.push(receivesNotes);
        } else if (chainItem instanceof SynthChain) {
            // it's a synth chain 
            acc.push(...getNoteReceivers(chainItem.chain, recursionDepth + 1));
        } else if (chainItem instanceof SynthStack) {
            // It's a parallel stack of audio modules, recurse
            const subReceivers: ReceivesNotes[] = [];
            chainItem.chains.forEach(chain => subReceivers.push(
                ...getNoteReceivers(chain.chain, recursionDepth + 1))
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
    chain: ChainStep[] = [];
    chainChangedEventListeners = new Set<() => void>();
    readonly patcheableType = PatcheableType.SynthChain;
    readonly enable = false;
    readonly disable = false;

    constructor(audioContext: AudioContext) {
        this.output = audioContext.createGain();
        this.input = audioContext.createGain();
    }
    handleChanged = () => {
        console.log("chain changed");
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
        if (recursion > MAX_RECURSION) {
            throw new Error("chain recursion depth exceeded");
        }
        let prevModule: PatcheableTrait | undefined;
        for (let step of this.chain) {
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
        return getNoteReceivers(this.chain);
    }
    addAudioModule = (position: number, newModule: PatcheableTrait) => {
        this.chain.splice(position, 0, newModule);
        this.rewire();
        this.handleChanged();
    }
    replaceAudioModule = (
        removedModule: ChainStep,
        newModule: ChainStep,
    ) => {
        const index = this.chain.indexOf(removedModule);
        if (index === -1) {
            console.warn("module not found in chain");
            return;
        }
        removedModule.disable?removedModule.disable():undefined;
        this.chain.splice(index, 1);
        this.chain.splice(index, 0, newModule);
        this.rewire();
        this.handleChanged();
    }
    removeAudioModule = (step: ChainStep) => {
        const index = this.chain.indexOf(step);
        if (index === -1) {
            console.warn("module not found in chain", this.chain, step);
            return;
        }
        this.removeAudioModuleAt(index);
    }
    removeAudioModuleAt = (index: number) => {
        const step = this.chain[index];
        step.disable?step.disable():undefined;
        this.chain.splice(index, 1);
        this.rewire();
        this.handleChanged();
    }
    releaseAll = () => {
        this.getNoteReceivers().forEach(receiver => receiver.stop());
    }

}