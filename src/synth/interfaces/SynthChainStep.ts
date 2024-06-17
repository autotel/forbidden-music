export enum SynthChainStepType {
    AudioModule,
    SynthStack,
    SynthChain,
}
export interface SynthChainStep {
    type: SynthChainStepType;
}