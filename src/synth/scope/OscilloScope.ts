import { createAudioEnvelopeWorklet } from "../../functions/audioEnvelopeWorkletFactory";
import { createMaximizerWorklet } from "../../functions/maximizerWorkletFactory";
import { AudioModule } from "../types/AudioModule";
import { createAutomatableAudioNodeParam } from "../types/Automatable";
import { NumberSynthParam, ParamType, SynthParam } from "../types/SynthParam";

export class OscilloScope extends AudioModule {
    output: GainNode;
    input: GainNode;
    enabledCalled: boolean = false;
    bufferLengthParam: NumberSynthParam = {
        type: ParamType.number,
        displayName: "Zoom",
        range: [128, 2048],
        _v: 1024,
        set value(v: number) {
            this._v = Math.round(v);
        },
        get value() {
            return this._v;
        },
        min: 128,
        max: 2048,
        exportable: true,
    }
    params: SynthParam[] = [this.bufferLengthParam];
    constructor(
        audioContext: AudioContext,
    ) {
        super();
        audioContext;
        
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 2048;

        this.input.connect(analyzer);
        this.input.connect(this.output);

        let prevValue = 0;
        
        this.getWaveform = () => {
            const returnLength = this.bufferLengthParam.value;
            const bufferLength = analyzer.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            let searchUntil = bufferLength - returnLength;
            let highestValue = 0;
            let triggerIndex = 0;
            analyzer.getByteTimeDomainData(dataArray);
            for(let i = 0; i < searchUntil; i++) {
                if(
                    dataArray[i] > highestValue 
                    && dataArray[i] > prevValue // on incresing edge
                ) {
                    highestValue = dataArray[i];
                    triggerIndex = i;
                }
                prevValue = dataArray[i];
            }
            return Array.from(dataArray.slice(triggerIndex, triggerIndex + returnLength));
        }

    }
    getWaveform() {
        return [0];
    }

}
