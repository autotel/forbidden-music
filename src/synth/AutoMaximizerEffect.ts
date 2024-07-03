import { createAudioEnvelopeWorklet } from "../functions/audioEnvelopeWorkletFactory";
import { createMaximizerWorklet } from "../functions/maximizerWorkletFactory";
import { AudioModule } from "./interfaces/AudioModule";
import { createAutomatableAudioNodeParam } from "./interfaces/Automatable";

export class AutoMaximizerEffect extends AudioModule {
    output: GainNode;
    input: GainNode;
    constructor(
        audioContext: AudioContext,
    ) {
        super();
        audioContext;

        this.output = audioContext.createGain();
        this.input = audioContext.createGain();
        this.input.connect(this.output);
        this.input.gain.value = 1;

        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;

        let maximizer: AudioNode | undefined;
        let envelopeFollower: AudioWorkletNode | undefined;

        this.params.push(createAutomatableAudioNodeParam(this.input.gain, 'Input Gain', 0, 10));

        this.enable = async () => {
            if (!maximizer) {
                maximizer = await createMaximizerWorklet(audioContext);
            }
            // if (!envelopeFollower) {
            //     envelopeFollower = await createAudioEnvelopeWorklet(audioContext);
            // }
            this.input.disconnect();
            maximizer.connect(this.output);
            this.input.connect(maximizer);
            // this.input.connect(envelopeFollower);

            /**
            envelopeFollower.connect(analyzer);
            // @ts-ignore
            let increaseRateParam: AudioParam | undefined = envelopeFollower.parameters.get('increaseRate');
            // @ts-ignore
            let decreaseRateParam: AudioParam | undefined = envelopeFollower.parameters.get('decreaseRate');
            // @ts-ignore
            let levelParam: AudioParam | undefined = envelopeFollower.parameters.get('level');

            if(!increaseRateParam || !decreaseRateParam || !levelParam) {
                throw new Error('Failed to get envelope follower parameters');
            }

            this.params.push(createAutomatableAudioNodeParam(increaseRateParam, 'Increase Rate', 0, 1));
            this.params.push(createAutomatableAudioNodeParam(decreaseRateParam, 'Decrease Rate', 0, 1));


            this.getMeasuredLevel = () => {
                if (!levelParam) return 0;
                return levelParam.value;
            }
                */
        }
        this.disable = () => {
        }

        this.getWaveform = () => {
            const bufferLength = analyzer.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyzer.getByteTimeDomainData(dataArray);
            return [...dataArray];
        }

    }
    getMeasuredLevel() {
        return 0;
    }
    getWaveform() {
        return [0];
    }
        
}
