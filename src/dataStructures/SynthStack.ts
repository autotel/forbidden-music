import { PatcheableTrait, PatcheableType } from "../dataTypes/PatcheableTrait";
import { SynthChain } from "./SynthChain";
export const MAX_RECURSION = 10;

export class SynthStack implements PatcheableTrait {
    name = "SynthStack";
    readonly patcheableType = PatcheableType.SynthChain;
    output: AudioNode;
    input: AudioNode;
    chains: SynthChain[] = [];
    isSynthStack = true;
    addChain: () => SynthChain;
    enable: false | (() => void) = false;
    constructor(audioContext: AudioContext) {
        this.output = audioContext.createGain();
        this.input = audioContext.createGain();
        // this.destination = destination;
        this.addChain = () => {
            const newChain = new SynthChain(audioContext);
            // newChain.addChangeListener(() => this.rewire());
            newChain.output.connect(this.output);
            this.input.connect(newChain.input);
            this.chains.push(newChain);
            return newChain;
        }
    }
    rewire(recursion = 0) {
        if (recursion > MAX_RECURSION) {
            throw new Error("recursion depth exceeded");
        }
        if (this.chains.length === 0) {
            this.input.connect(this.output);
        } else {
            this.input.disconnect();
        }
        this.chains.forEach((synthChain, index) => {
            synthChain.rewire(recursion + 1);
            this.input.connect(synthChain.input);
            synthChain.output.connect(this.output);
        });
    }
    removeChain(index: number) {
        this.chains[index].output.disconnect(this.output);
        this.chains.splice(index, 1);
        this.rewire();
    }
    empty() {
        // this.chains.forEach(synthChain => synthChain.removeChangeListeners());
        this.chains = [];
        this.rewire();
    }
    disable() {
        this.chains.forEach(synthChain => synthChain.chain.map(({ disable }) => disable ? disable() : false));
    }
}