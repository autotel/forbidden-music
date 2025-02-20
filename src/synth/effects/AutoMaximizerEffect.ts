import { createAudioEnvelopeWorklet } from "../../functions/audioEnvelopeWorkletFactory";
import { createMaximizerWorklet } from "../../functions/maximizerWorkletFactory";
import { AudioModule } from "../types/AudioModule";
import { automatableNumberSynthParam } from "../types/Automatable";

export class AutoMaximizerEffect extends AudioModule {
    output: GainNode;
    input: GainNode;
    lastMeasuredLevel: number = 0;
    enabledCalled: boolean = false;
    constructor(
        audioContext: AudioContext,
    ) {
        super();
        audioContext;
        
        this.output = audioContext.createGain();
        this.input = audioContext.createGain();
        this.input.connect(this.output);
        this.input.gain.value = 1;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        let maximizer: AudioNode | undefined;
        let envelopeFollower: AudioWorkletNode | undefined;

        this.params.push(automatableNumberSynthParam(this.input.gain, 'Input Gain', 0, 10));
        this.params.push(automatableNumberSynthParam(this.output.gain, 'Output Gain', 0, 10));

        this.enable = async () => {
            if(this.enabledCalled) return; // this will happen if recycling
            this.enabledCalled = true;
            if (!maximizer) {
                maximizer = await createMaximizerWorklet(audioContext);
            }
            if (!envelopeFollower) {
                envelopeFollower = await createAudioEnvelopeWorklet(audioContext);
            }
            this.input.disconnect();
            maximizer.connect(this.output);
            this.input.connect(maximizer);
            this.input.connect(envelopeFollower);
            envelopeFollower.connect(this.output.gain);

            envelopeFollower.connect(analyser);
            // @ts-ignore
            let increaseRateParam: AudioParam | undefined = envelopeFollower.parameters.get('increaseRate');
            // @ts-ignore
            let decreaseRateParam: AudioParam | undefined = envelopeFollower.parameters.get('decreaseRate');
            // @ts-ignore
            let levelParam: AudioParam | undefined = envelopeFollower.parameters.get('level');
            // @ts-ignore
            let biasParam: AudioParam | undefined = envelopeFollower.parameters.get('bias');

            if (!increaseRateParam || !decreaseRateParam || !levelParam || !biasParam) {
                throw new Error('Failed to get envelope follower parameters');
            }

            levelParam.value = -1;

            this.params.splice(1,0,
                automatableNumberSynthParam(increaseRateParam, 'Increase Rate'),
                automatableNumberSynthParam(decreaseRateParam, 'Decrease Rate'),
                automatableNumberSynthParam(biasParam, 'Env Bias'),
                automatableNumberSynthParam(levelParam, 'Expansion Level')
            );

            envelopeFollower.port.onmessage = (event) => {
                this.lastMeasuredLevel = event.data;
            }

            this.markReady();
        }
        
        this.disable = () => {
        }

        this.getWaveform = () => {
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray);
            return [...dataArray];
        }

    }
    getMeasuredLevel() {
        return this.lastMeasuredLevel;
    }
    getWaveform() {
        return [0];
    }

}
