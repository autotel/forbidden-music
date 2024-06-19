import { PatcheableType } from "../../dataTypes/PatcheableTrait";
import { Synth, SynthVoice } from "../super/Synth";



class ThingyVoice implements SynthVoice {
    output?: AudioNode;
    inUse = true;
    scheduleStart = (
        frequency: number,
        absoluteStartTime: number,
        /** parameters unique to this triggered event, such as velocity and whatnot */
        noteParameters: any
    ) => { return this };
    scheduleEnd = (
        absoluteStopTime: number,
    ) => { return this }
    stop = () => { }
}


export class ThingyScoreFx extends Synth {
    readonly receivesNotes = true;
    readonly chainStepType = PatcheableType.AudioModule;
    output: GainNode;
    params = [];
    source?: AudioBufferSourceNode;
    inherentFrequency = Infinity;
    constructor(audioContext: AudioContext) {
        super(audioContext);
        this.output = audioContext.createGain();
        this.setWave = (wave: number[]) => {
            if (this.source) {
                this.source.stop();
                this.source.disconnect();
            }
            const source = this.source = audioContext.createBufferSource();
            const buffer = audioContext.createBuffer(1, wave.length, audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < wave.length; i++) {
                data[i] = wave[i];
            }
            source.buffer = buffer;
            source.loop = true;
            this.inherentFrequency = audioContext.sampleRate / wave.length;
            source.connect(this.output);
            source.playbackRate.value = 80 / this.inherentFrequency;
            source.start();
        };
    }
    setWave: (wave: number[]) => void
}