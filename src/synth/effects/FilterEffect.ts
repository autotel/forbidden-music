import { AudioModule } from "../types/AudioModule";
import { automatableNumberSynthParam } from "../types/Automatable";
import { ParamType, SynthParam } from "../types/SynthParam";


type BiquadFilterType = "lowpass" | "highpass" | "bandpass" | "lowshelf" | "highshelf" | "peaking" | "notch" | "allpass";
type FilterOption = {
    value: BiquadFilterType,
    displayName: string,
}

export class FilterEffect extends AudioModule {
    output: GainNode;
    input: GainNode;
    params: SynthParam[];

    constructor(
        audioContext: AudioContext,
    ) {
        super();
        this.output = audioContext.createGain();
        this.input = audioContext.createGain();
        const dry = audioContext.createGain();
        const wet = audioContext.createGain();
        dry.gain.value = 0;
        wet.gain.value = 1;
        const filter = audioContext.createBiquadFilter();
        filter.type = "lowpass";

        this.params = [
            automatableNumberSynthParam(this.output.gain, 'gain', 0, 1),
            automatableNumberSynthParam(filter.frequency, 'frequency', 2, 20000),
            automatableNumberSynthParam(filter.Q, 'Q', 0.0001, 6),
            {
                type: ParamType.number,
                displayName: "wet",
                set value(v: number) {
                    dry.gain.value = 1 - v;
                    wet.gain.value = v;
                },
                get value() {
                    return wet.gain.value;
                },
                animate: (startTime: number, destTime: number, destValue: number) => {
                    dry.gain.linearRampToValueAtTime(1 - destValue, destTime);
                    wet.gain.linearRampToValueAtTime(destValue, destTime);
                },
                stopAnimations: (startTime: number = 0) => {
                    dry.gain.cancelScheduledValues(startTime);
                    wet.gain.cancelScheduledValues(startTime);
                },
                min: 0,
                max: 1,
                exportable: true,

            }, {
                type: ParamType.option,
                displayName: "Filter type",
                _v: 0,
                options: [
                    { value: "lowpass", displayName: "Lowpass" },
                    { value: "highpass", displayName: "Highpass" },
                    { value: "bandpass", displayName: "Bandpass" },
                    { value: "lowshelf", displayName: "Lowshelf" },
                    { value: "highshelf", displayName: "Highshelf" },
                    { value: "peaking", displayName: "Peaking" },
                    { value: "notch", displayName: "Notch" },
                    { value: "allpass", displayName: "Allpass" },
                ] as FilterOption[],
                set value(v: number) {
                    this._v = v;
                    filter.type = this.options[this._v].value as unknown as BiquadFilterType;
                },
                get value() {
                    return this._v;
                },
                exportable: true,
            }
        ];

        this.enable = async () => {
            this.input.connect(dry);
            this.input.connect(filter);
            filter.connect(wet);


            dry.connect(this.output);
            wet.connect(this.output);
            this.markReady();
        }

        this.disable = () => {
            filter.disconnect();
            wet.disconnect();
            dry.disconnect();
            this.input.disconnect();
        }

    }
}
