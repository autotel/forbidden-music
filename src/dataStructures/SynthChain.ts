import { AudioModule } from "../synth/interfaces/AudioModule";
import { SynthChainStep, SynthChainStepType } from "../synth/interfaces/SynthChainStep";
import { ReceivesNotes } from "../synth/super/Synth";
import { SynthStack, isStack } from "./SynthStack";
const MAX_RECURSION = 10;
export type ChainStep = AudioModule | SynthStack;
const getNoteReceivers = (
    modules: (ChainStep | SynthChain)[],
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
            acc.push(...chainItem.noteReceivers);
        } else if (isStack(chainItem)) {
            // It's a parallel stack of audio modules, recurse
            const subReceivers = getNoteReceivers(chainItem, recursionDepth + 1);
            acc.push(...subReceivers);
        } 
        return acc;
    }, [] as ReceivesNotes[]);
}

export class SynthChain implements SynthChainStep {
    name = "SynthChain";
    type = SynthChainStepType.SynthChain;
    destination: AudioNode;
    chain: ChainStep[] = [];
    noteReceivers: ReceivesNotes[] = [];
    chainChangedEventListeners = new Set<() => void>();

    constructor(destination: AudioNode) {
        this.destination = destination;
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
    rewire = (recursion = 0) => {
        if(!this.destination) throw new Error("destination not set");
        if (recursion > MAX_RECURSION) {
            throw new Error("chain recursion depth exceeded");
        }
        let prevModule: AudioModule | undefined;
        console.log("receive notes", this.noteReceivers.map(r => r.name));
        for (let item of this.chain) {
            if (isStack(item)) {
                for(let chain of item){
                    chain.rewire(recursion + 1);
                }
            } else {
                const audioModule = item;
                if (audioModule.output) {
                    audioModule.output.disconnect();
                }
                if (prevModule && prevModule.output && audioModule.input) {
                    prevModule.output.connect(audioModule.input);
                    console.log("connecting ", prevModule.name, "to", audioModule.name);
                }
                prevModule = audioModule;
            }
        }
        if (prevModule && prevModule.output) {
            prevModule.output.connect(this.destination);
            console.log("connecting ", prevModule.name, "to effects store input");
        }
        this.noteReceivers = getNoteReceivers(this.chain);
    }
    addAudioModule = (position: number, newModule: ChainStep) => {
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
        if(! isStack(removedModule)) removedModule.disable();
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
        if(! Array.isArray(step)) step.disable();
        this.chain.splice(index, 1);
        this.rewire();
        this.handleChanged();
    }
    releaseAll = () => {
        this.noteReceivers.forEach(receiver => receiver.stop());
    }

}