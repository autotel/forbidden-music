import { AudioModule } from "../types/AudioModule";
import { automatableNumberSynthParam } from "../types/Automatable";
import { SynthParam } from "../types/SynthParam";

export class SimpleDelayEffect extends AudioModule {
    output: GainNode;
    input: GainNode;
    params: SynthParam[];

    constructor(
        audioContext: AudioContext,
    ) {
        super();
        const output = this.output = audioContext.createGain();
        const input = this.input = audioContext.createGain();
        const feedback = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        const delay = audioContext.createDelay();
        const direct = audioContext.createGain();
        const send = audioContext.createGain();

        direct.gain.value = 0.5;
        send.gain.value = 0.5;
        feedback.gain.value = 0.5;

        this.params = [
            automatableNumberSynthParam(output.gain, 'gain', 0, 2),
            automatableNumberSynthParam(feedback.gain, 'feedback', 0, 1),
            automatableNumberSynthParam(direct.gain, 'dry', 0, 1),
            automatableNumberSynthParam(send.gain, 'send', 0, 1),

            automatableNumberSynthParam(filter.frequency, 'frequency', 0, 22000),
            automatableNumberSynthParam(filter.Q, 'Q', 0, 3),
            automatableNumberSynthParam(delay.delayTime, 'delayTime'),
        ];

        this.enable = async () => {
            input.connect(direct);
            input.connect(send);
            send.connect(delay);
            delay.connect(filter);
            filter.connect(feedback);
            feedback.connect(delay);
            filter.connect(output);
            direct.connect(output);
            this.markReady();
        }

        this.disable = () => {
            [
                input,
                direct,
                send,
                delay,
                filter,
                feedback,
            ].forEach(node => node.disconnect());
        }

    }
}
