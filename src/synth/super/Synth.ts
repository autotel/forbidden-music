import { EventParamsBase,  SynthParam, SynthVoice, synthVoiceFactory } from "../SynthInterface";


type SynthExtraParams = EventParamsBase & {
}

export class Synth<
    V extends SynthVoice = SynthVoice,
> {
    name: string = "Synth";
    /** voice instances */
    instances: V[] = [];
    createVoice: () => V;
    enable = () => { }
    disable = () => { }
    output: GainNode;
    audioContext: AudioContext;
    constructor(
        audioContext: AudioContext,
        factory: synthVoiceFactory<V>
    ) {
        this.createVoice = () => {
            const voice = factory(audioContext);
            voice.output.connect(this.output);
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
        noteParameters: SynthExtraParams
    ) {
        const voice = this.allocateVoice();
        voice.scheduleStart(frequency, absoluteStartTime, noteParameters);
        return voice;
    }
    schedulePerc(
        frequency: number,
        absoluteStartTime: number,
        noteParameters: SynthExtraParams
    ) {
        const voice = this.scheduleStart(frequency, absoluteStartTime, noteParameters)
        voice.scheduleEnd(absoluteStartTime);
        return voice;
    }
    stop = () => {
        this.instances.forEach((voice) => {
            voice.stop();
        });
    }
    params = [] as SynthParam[];
}
