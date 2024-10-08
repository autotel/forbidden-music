import { baseFrequency } from "@/functions/toneConverters";
import { AudioModule } from "../types/AudioModule";
import { automatableNumberSynthParam, AutomatableSynthParam } from "../types/Automatable";
import { NumberSynthParam, optionSynthParam, ParamType, SynthParam } from "../types/SynthParam";
import { useThrottleFn } from "@vueuse/core";

export class DelayEffect extends AudioModule {
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
        const delay = audioContext.createDelay(3);
        const dry = audioContext.createGain();
        const send = audioContext.createGain();

        dry.gain.value = 1;
        send.gain.value = 0;
        feedback.gain.value = 0.5;
        filter.frequency.value = baseFrequency;
        delay.delayTime.value = 0.75;
        filter.detune.value = 12000;

        // To prevent delay time-changing related artifacts
        const delayTimeSetter = useThrottleFn((v: number) => {
            const now = audioContext.currentTime;
            delay.delayTime.cancelScheduledValues(0);
            delay.delayTime.linearRampToValueAtTime(v, now + 0.2);
        }, 200, true);


        this.params = [
            automatableNumberSynthParam(output.gain, 'gain', 0, 2),
            automatableNumberSynthParam(feedback.gain, 'feedback', 0, 1),
            automatableNumberSynthParam(dry.gain, 'dry', 0, 1),
            automatableNumberSynthParam(send.gain, 'send', 0, 1),
            {
                type: ParamType.number,
                currentTarget: delay.delayTime.value,
                get value() {
                    return this.currentTarget;
                },
                set value(v: number) {
                    this.currentTarget = v;
                    delayTimeSetter(v);
                },
                min: delay.delayTime.minValue,
                max: delay.delayTime.maxValue,
                displayName: 'delay time',
                animate(startTime: number, destTime: number, destValue: number) {
                    delay.delayTime.cancelScheduledValues(startTime);
                    delay.delayTime.linearRampToValueAtTime(destValue, destTime);
                },
                stopAnimations(startTime: number = 0) {
                    delay.delayTime.cancelScheduledValues(startTime || 0);
                },
                exportable: true,
            } as NumberSynthParam & AutomatableSynthParam,

            optionSynthParam(filter, 'type', [
                'lowpass',
                'highpass',
                'bandpass',
                'lowshelf',
                'highshelf',
                // 'peaking',
                // 'notch',
                // 'allpass',
            ]),
            automatableNumberSynthParam(filter.detune, 'filter cents', 0, 12000),
            automatableNumberSynthParam(filter.Q, 'Q', 0, 3),
        ];

        this.enable = async () => {
            input.connect(dry);
            input.connect(send);
            send.connect(delay);
            delay.connect(filter);
            filter.connect(feedback);
            feedback.connect(delay);
            filter.connect(output);
            dry.connect(output);
            this.markReady();
        }

        this.disable = () => {
            [
                input,
                dry,
                send,
                delay,
                filter,
                feedback,
            ].forEach(node => node.disconnect());
        }

    }
}
