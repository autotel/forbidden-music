import { EventParamsBase, SynthParam, SynthVoice, synthVoiceFactory } from "../super/SynthInterface";

interface SynthBase {
    name: string;
    enable: () => void;
    disable: () => void;
    params: SynthParam[];
    isReady: boolean;
    /** indicates whether this synth needs to fetch something from server, thus incurring in costs */
    needsFetching?: boolean;
    transformTriggerParams?: (p: EventParamsBase) => EventParamsBase;
    scheduleStart: (
        frequency: number,
        absoluteStartTime: number,
        noteParameters: EventParamsBase
    ) => SynthVoice;
    schedulePerc: (
        frequency: number,
        absoluteStartTime: number,
        noteParameters: EventParamsBase
    ) => SynthVoice;
    stop: () => void;
}

export interface SynthInterface extends SynthBase {
    output: GainNode;
}

export interface ExternalSynthInterface extends SynthBase{
}

export class Synth<
    A extends EventParamsBase = EventParamsBase,
    V extends SynthVoice = SynthVoice<A>,
> implements SynthInterface {
    name: string = "Synth";
    isReady = false;
    /** voice instances */
    instances: V[] = [];
    createVoice: () => V;
    enable = () => { this.isReady = true; }
    disable = () => { this.isReady = false; }
    output: GainNode;
    audioContext: AudioContext;
    params: SynthParam[] = [];
    transformTriggerParams?: (p: EventParamsBase) => A;
    constructor(
        audioContext: AudioContext,
        factory: synthVoiceFactory<V>,
    ) {
        this.createVoice = () => {
            const voice = factory(
                audioContext,
                this
            );
            if(voice.output) voice.output.connect(this.output);
            return voice;
        }
        this.output = audioContext.createGain();
        this.audioContext = audioContext;
    }

    findFreeVoice() {
        const freeVoice = this.instances.find((voice) => !voice.inUse);
        return freeVoice || null;
    }
    allocateVoice() {
        const freeVoice = this.findFreeVoice();
        if (freeVoice) {
            return freeVoice;
        } else {
            const voice = this.createVoice();
            this.instances.push(voice);
            return voice;
        }
    }
    scheduleStart(
        frequency: number,
        absoluteStartTime: number,
        noteParameters: EventParamsBase
    ) {
        const voice = this.allocateVoice();
        if (this.transformTriggerParams) {
            noteParameters = this.transformTriggerParams(noteParameters);
        }
        voice.scheduleStart(frequency, absoluteStartTime, noteParameters);
        return voice;
    }
    schedulePerc(
        frequency: number,
        absoluteStartTime: number,
        noteParameters: EventParamsBase
    ) {
        if (this.transformTriggerParams) {
            noteParameters = this.transformTriggerParams(noteParameters);
        }
        const voice = this.scheduleStart(frequency, absoluteStartTime, noteParameters)
        const { velocity } = noteParameters;
        voice.scheduleEnd(
            absoluteStartTime + velocity * 2.8
        );
        return voice;
    }
    stop = () => {
        this.instances.forEach((voice) => {
            voice.stop();
        });
    }
}
