import { SynthChainStep, SynthChainStepType } from "../synth/interfaces/SynthChainStep";
import { ChainStep, SynthChain } from "./SynthChain";

export const isStack = (step: ChainStep): step is SynthStack => {
    return step.type === SynthChainStepType.SynthStack;
}

export class SynthStack extends Array<SynthChain> implements SynthChainStep{
    name = "SynthStack";
    type = SynthChainStepType.SynthStack;
    destination: AudioNode;
    isSynthStack = true;
    constructor(destination:AudioNode){
        super();
        this.destination = destination;
    }
    rewire(){
        this.destination.disconnect();
        this.forEach((synthChain, index) => {
            synthChain.destination = this.destination;
            synthChain.rewire();
            synthChain.destination.connect(this.destination);
        });
    }
}