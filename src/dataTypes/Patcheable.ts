import { SynthChain } from "../dataStructures/SynthChain";
import { SynthStack } from "../dataStructures/SynthStack";
import { AudioModule } from "../synth/interfaces/AudioModule";

export type Patcheable = SynthChain | SynthStack | AudioModule | { input?: AudioNode, output: AudioNode, name: string } 