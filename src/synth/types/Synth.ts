import { PatcheableTrait, PatcheableType } from "../../dataTypes/PatcheableTrait";
import { AudioModule, ReceivesNotes } from "./AudioModule";
import { SynthParam } from "./SynthParam";

export interface EventParamsBase {
    [key: string]: any,
    velocity: number,
}

export interface SynthVoice<A = EventParamsBase> {
    output?: AudioNode;
    inUse: boolean;
    scheduleStart: (
        frequency: number,
        absoluteStartTime: number,
        /** parameters unique to this triggered event, such as velocity and whatnot */
        noteParameters: any & A
    ) => void;
    scheduleEnd: (
        absoluteStopTime?: number,
    ) => void
}

export interface PatcheableSynthVoice<A = EventParamsBase> extends SynthVoice<A>, PatcheableTrait {
    patcheableType: PatcheableType.AudioVoiceModule;
    name: string,
    output: AudioNode,
    needsFetching?: boolean,
    paramsRef: { value: SynthParam[] };
    receivesNotes?: boolean;
}


export type synthVoiceFactory<
    VoiceGen extends SynthVoice<A>,
    A = any
> = (
    audioContext: AudioContext,
    synthParams: A
) => VoiceGen;




export class Synth<
    A extends EventParamsBase = EventParamsBase,
    Voice extends SynthVoice = SynthVoice<A>,
> extends AudioModule implements ReceivesNotes {
    // Basic Traits
    readonly receivesNotes = true;
    readonly patcheableType = PatcheableType.AudioModule;

    // AudioModule
    name = "Synth";
    output: GainNode;
    params: SynthParam[] = [];

    // Synth
    /** voice instances */
    instances: Voice[] = [];
    createVoice: () => Voice;
    transformTriggerParams?: (p: EventParamsBase) => A;

    constructor(
        audioContext: AudioContext,
        factory?: synthVoiceFactory<Voice>,
    ) {
        super();

        this.createVoice = () => {
            if (!factory) throw new Error("No factory provided to create voice");
            const voice = factory(
                audioContext,
                this
            );
            if (voice.output) voice.output.connect(this.output);
            return voice;
        }
        this.output = audioContext.createGain();
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
        const voice = this.scheduleStart(frequency, absoluteStartTime, {
            ...noteParameters,
            perc: true,
        })
        const { velocity } = noteParameters;
        voice.scheduleEnd(
            absoluteStartTime + velocity * 2.8
        );
        return voice;
    }

    scheduleEnd = (when?: number | undefined) => {
        this.instances.forEach((voice) => {
            voice.scheduleEnd(when);
        });
    }
}

