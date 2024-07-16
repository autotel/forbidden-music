import { createFoldedSaturatorWorklet } from "@/functions/foldedSaturatorWorkletFactory";
import { AudioModule } from "../types/AudioModule";
import { createAutomatableAudioNodeParam } from "../types/Automatable";

export class WaveFolderEffect extends AudioModule {
    output: GainNode;
    input: GainNode;
    lastMeasuredLevel: number = 0;
    enabledCalled: boolean = false;
    constructor(
        audioContext: AudioContext,
    ) {
        super();
        
        this.output = audioContext.createGain();
        this.input = audioContext.createGain();
        
        let enableCalled = false;

        this.enable = async () => {
            if (enableCalled) return;
            enableCalled = true;

            const foldedSaturator = await createFoldedSaturatorWorklet(audioContext);
            // @ts-ignore
            const preGainParam = foldedSaturator.parameters.get("preGain") as AudioParam;
            // @ts-ignore
            const postGainParam = foldedSaturator.parameters.get("postGain") as AudioParam;
            if (!preGainParam || !postGainParam) throw new Error("no preGain or postGain params");


            this.params.push(createAutomatableAudioNodeParam(
                preGainParam, 'fold pre-gain', 0, 1.5
            ));
            this.params.push(createAutomatableAudioNodeParam(
                postGainParam, 'gain'
            ));

            this.input.connect(foldedSaturator);
            foldedSaturator.connect(this.output);

            this.markReady();
        }
        
        this.disable = () => {
        }

    }
    getMeasuredLevel() {
        return this.lastMeasuredLevel;
    }
    getWaveform() {
        return [0];
    }

}
