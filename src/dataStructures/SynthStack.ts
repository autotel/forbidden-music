import { SynthChainStep, SynthChainStepType } from "../synth/interfaces/SynthChainStep";
import { ChainStep, SynthChain } from "./SynthChain";

export const isStack = (step: ChainStep): step is SynthStack => {
    return step.type === SynthChainStepType.SynthStack;
}

export class SynthStack implements SynthChainStep {
    name = "SynthStack";
    type = SynthChainStepType.SynthStack;
    output: AudioNode;
    chains: SynthChain[] = [];
    isSynthStack = true;
    constructor(audioContext: AudioContext) {
        this.output = audioContext.createGain();
        // this.destination = destination;
    }
    rewire(recursion = 0) {
        this.chains.forEach((synthChain, index) => {
            synthChain.rewire(recursion + 1);
        });
    }
    addChain() {
        const newChain = new SynthChain(this.output);
        this.chains.push(newChain);
        this.rewire();
        return newChain;
    }
    removeChain(index: number) {
        this.chains.splice(index, 1);
        this.rewire();
    }
    empty() {
        this.chains = [];
        this.rewire();
    }
    disable() {
        this.chains.forEach(synthChain => synthChain.chain.map(module => module.disable()));
    }
    
}