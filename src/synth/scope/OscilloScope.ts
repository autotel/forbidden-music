import { createAudioEnvelopeWorklet } from "../../functions/audioEnvelopeWorkletFactory";
import { createMaximizerWorklet } from "../../functions/maximizerWorkletFactory";
import { AudioModule } from "../types/AudioModule";
import { createAutomatableAudioNodeParam } from "../types/Automatable";

export class OscilloScope extends AudioModule {
    output: GainNode;
    input: GainNode;
    enabledCalled: boolean = false;
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

        const returnLength = 1024;

        this.getWaveform = () => {
            const bufferLength = analyzer.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            let searchUntil = bufferLength - returnLength;
            let highestValue = 0;
            let triggerIndex = 0;
            analyzer.getByteTimeDomainData(dataArray);
            for(let i = 0; i < searchUntil; i++) {
                if(dataArray[i] > highestValue) {
                    highestValue = dataArray[i];
                    triggerIndex = i;
                }
            }
            return Array.from(dataArray.slice(triggerIndex, triggerIndex + returnLength));
        }

    }
    getWaveform() {
        return [0];
    }

}
