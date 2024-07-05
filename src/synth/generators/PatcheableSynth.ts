import { SynthChain } from "../../dataStructures/SynthChain";
import { PatcheableType } from "../../dataTypes/PatcheableTrait";
import { FourierVoice, defaultPericWaveContents } from "./FourierSynth";
import { ParamType, SynthParam, VoicePatchSynthParam } from "../types/SynthParam";
import { EventParamsBase, PatcheableSynthVoice, Synth, SynthVoice, synthVoiceFactory } from "../types/Synth";
class PatcheableVoice implements PatcheableSynthVoice {
    name = "voice";
    readonly patcheableType = PatcheableType.AudioVoiceModule;
    output: AudioNode;
    paramsRef: { value: SynthParam[] };
    inUse: boolean = false;
    receivesNotes = true;
    scheduleStart: (frequency: number, absoluteStartTime: number, eventParams: EventParamsBase) => PatcheableVoice;
    scheduleEnd: (absoluteStopTime?: number) => PatcheableVoice;
    disable: false = false;
    enable: false = false;
    constructor(audioContext: AudioContext, paramsRef: { value: SynthParam[] }) {
        this.scheduleStart = () => this;
        this.scheduleEnd = (absoluteStopTime?:number) => {
            const relativeStop = (absoluteStopTime || audioContext.currentTime) - audioContext.currentTime;
            setTimeout(() => {
                this.inUse = false;
            }, relativeStop * 1000);
            return this;
        };
        // how to reduce this wasted node?
        this.output = audioContext.createGain();
        this.paramsRef = paramsRef;
    }
}

class SineVoice extends PatcheableVoice {
    output: OscillatorNode;
    constructor(audioContext: AudioContext, paramsRef: { value: SynthParam[] }) {
        super(audioContext, paramsRef);
        const oscillator = audioContext.createOscillator();
        this.output = oscillator;

        this.scheduleStart = (frequency: number, absoluteStartTime: number, noteParameters: any) => {
            oscillator.frequency.value = frequency;
            oscillator.start(absoluteStartTime);
            return this;
        }
    }
}

class SimpleEnvelopeVoiceFx extends PatcheableVoice {
    output: GainNode;
    input: AudioNode;
    constructor(audioContext: AudioContext, paramsRef: { value: SynthParam[] }) {
        super(audioContext, paramsRef);
        const gainNode = audioContext.createGain();
        this.output = this.input = gainNode;

        this.scheduleEnd = (absoluteStopTime?: number) => {
            gainNode.gain.cancelScheduledValues(absoluteStopTime || audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, absoluteStopTime || audioContext.currentTime);
            const relativeStop = (absoluteStopTime || audioContext.currentTime) - audioContext.currentTime;
            setTimeout(() => {
                this.inUse = false;
            }, relativeStop * 1000);
            return this;
        };
        this.scheduleStart = (frequency: number, absoluteStartTime: number, eventParams: EventParamsBase) => {
            this.inUse = true;
            gainNode.gain.cancelScheduledValues(absoluteStartTime);
            gainNode.gain.setValueAtTime(0, absoluteStartTime);
            gainNode.gain.linearRampToValueAtTime(eventParams.velocity, absoluteStartTime + 0.01);
            return this;
        };
    }
}


class PatchedVoice extends SynthChain implements SynthVoice {
    output: GainNode;
    inUse: boolean;
    scheduleStart: (frequency: number, absoluteStartTime: number, noteParameters: any) => void;
    scheduleEnd: (absoluteStopTime?: number) => void;
    constructor(
        audioContext: AudioContext,
        synth: PatcheableSynth,
    ) {
        super(audioContext);
        const chain = new SynthChain(audioContext);
        this.output = chain.output;
        this.output.gain.value = 0.1;
        const constructorsChain = synth.constructorsChainParam.value;
        chain.setAudioModules(
            constructorsChain.map(
                step => step.factory()
            )
        );
        this.inUse = true;
        this.scheduleStart = (frequency: number, absoluteStartTime: number, noteParameters: any) => {
            console.log("chain schedule start");
            chain.getNoteReceivers().forEach((receiver) => {
                console.log("receiver", receiver.name);
                receiver.scheduleStart(frequency, absoluteStartTime, noteParameters);
            });
        }
        this.scheduleEnd = (absoluteStopTime?: number) => {
            chain.getNoteReceivers().forEach((receiver) => {
                receiver.scheduleEnd(absoluteStopTime);
            });
        }
    }
}

const voiceChainFactory: synthVoiceFactory<PatchedVoice> = (audioContext, synthParams) => {
    return new PatchedVoice(audioContext, synthParams);
}

export class PatcheableSynth extends Synth<EventParamsBase, PatchedVoice> {

    constructorsChainParam: VoicePatchSynthParam = {
        type: ParamType.voicePatch,
        value: [
            {
                type: 'sine',
                factory: () => new SineVoice(this.audioContext, this.paramsRef),
                params: []
            },
            {
                type: 'envelope',
                factory: () => new SimpleEnvelopeVoiceFx(this.audioContext, this.paramsRef),
                params: []
            },
        ],
        exportable: true,
    }
    paramsRef: { value: SynthParam[]; };
    constructor(
        audioContext: AudioContext,
    ) {
        super(audioContext, voiceChainFactory);
        this.params = [this.constructorsChainParam];
        this.paramsRef = { value: this.params };
    }
}
