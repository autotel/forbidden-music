import { SynthChainStepType } from "../interfaces/SynthChainStep";
import { ReceivesNotes, SynthVoice } from "../super/Synth";


class ThingyVoice implements SynthVoice {
    output?: AudioNode;
    inUse = true;
    scheduleStart = (
        frequency: number,
        absoluteStartTime: number,
        /** parameters unique to this triggered event, such as velocity and whatnot */
        noteParameters: any
    ) => { };
    scheduleEnd = (
        absoluteStopTime: number,
    ) => { }
    stop = () => {}
}


export class ThingyScoreFx implements ReceivesNotes {
    readonly receivesNotes = true;
    readonly type = SynthChainStepType.AudioModule;
    output: GainNode;
    params = [];
    source?: AudioBufferSourceNode;
    inherentFrequency = Infinity;
    constructor(audioContext: AudioContext) {
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
    scheduleStart = (
        frequency: number,
        absoluteStartTime: number,
        noteParameters: any
    ) => {
        return new ThingyVoice();

    };
    schedulePerc = (
        frequency: number,
        absoluteStartTime: number,
        noteParameters: any
    ) => {
        const v = this.scheduleStart(frequency, absoluteStartTime, noteParameters);
        v.scheduleEnd(absoluteStartTime + 0.1);
        return v;
    };
    stop = () => { };
    enable = () => { };
    disable = () => { };
    setWave:(wave: number[]) => void
}