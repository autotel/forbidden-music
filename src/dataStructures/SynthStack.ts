import { PATCHING_MAX_DEPTH } from "../consts/PatchingMaxDepth";
import { PatcheableTrait, PatcheableType } from "../dataTypes/PatcheableTrait";
import { SynthChain } from "./SynthChain";

export class SynthStack implements PatcheableTrait {
    name = "SynthStack";
    readonly patcheableType = PatcheableType.SynthChain;
    output: AudioNode;
    input: AudioNode;
    children: SynthChain[] = [];
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
            this.children.push(newChain);
            return newChain;
        }
    }
    rewire(recursion = 0) {
        if (recursion > PATCHING_MAX_DEPTH) {
            throw new Error("recursion depth exceeded");
        }
        if (this.children.length === 0) {
            this.input.connect(this.output);
        } else {
            this.input.disconnect();
        }
        this.children.forEach((synthChain, index) => {
            synthChain.rewire(recursion + 1);
            this.input.connect(synthChain.input);
            synthChain.output.connect(this.output);
        });
    }
    removeChain(index: number) {
        this.children[index].output.disconnect(this.output);
        this.children.splice(index, 1);
        this.rewire();
    }
    empty() {
        // this.children.forEach(synthChain => synthChain.removeChangeListeners());
        this.children = [];
        this.rewire();
    }
    disable() {
        this.children.forEach(synthChain => synthChain.children.map(({ disable }) => disable ? disable() : false));
    }
}