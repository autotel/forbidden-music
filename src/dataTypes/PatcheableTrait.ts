export enum PatcheableType {
    AudioModule,
    AudioVoiceModule,
    SynthStack,
    SynthChain,
}

export type PatcheableTrait = {
    input?: AudioNode,
    output?: AudioNode, 
    name?: string,
    disable: false | (() => void),
    enable: false | (() => void),
    patcheableType: PatcheableType;
    children?: PatcheableTrait[];
}
