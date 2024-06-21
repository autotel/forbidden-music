import { AudioModule } from "./interfaces/AudioModule";
import { ParamType, SynthParam } from "./interfaces/SynthParam";

export class RingModEffect extends AudioModule {
    output: GainNode;
    input: GainNode;
    enable: () => void;
    disable: () => void;
    params: SynthParam[];

    constructor(
        audioContext: AudioContext,
    ) {
        super();
        this.output = audioContext.createGain();
        this.input = audioContext.createGain();
        const dry = audioContext.createGain();
        const wet = audioContext.createGain();
        const ringer = audioContext.createGain();
        dry.gain.value = 0;
        wet.gain.value = 1;
        const oscillator = audioContext.createOscillator();
        // Id' like to have noise too, but its not available. Later I could think of using periodic wave?
        oscillator.type = "sine";
        type OscillatorOption = {
            value: OscillatorType,
            displayName: string,
        }
        this.params = [{
            type: ParamType.number,
            displayName: "Frequency",
            _v: Math.log2(oscillator.frequency.value * 10),
            set value(v: number) {
                this._v = v;
                oscillator.frequency.value = Math.pow(2, v) / 10;
            },
            get value() {
                return this._v;
            },
            get displayValue() {
                return `${oscillator.frequency.value.toFixed(3)}`;
            },
            min: 0,
            max: 15,
            exportable: true,
        },{
            type: ParamType.number,
            displayName: "wet",
            set value(v: number) {
                dry.gain.value = 1-v;
                wet.gain.value = v;
            },
            get value() {
                return wet.gain.value;
            },
            min: 0,
            max: 1,
            exportable: true,
        
        },{
            type: ParamType.option,
            displayName: "Waveform",
            _v: 0,
            options: [
                {value: "sine", displayName: "Sine"},
                {value: "square", displayName: "Square"},
                {value: "sawtooth", displayName: "Sawtooth"},
                {value: "triangle", displayName: "Triangle"},
            ] as OscillatorOption[],
            set value(v: number) {
                this._v = v;
                oscillator.type = this.options[this._v].value as unknown as OscillatorType;
            },
            get value() {
                return this._v;
            },
            exportable: true,
        }];

        this.enable = async () => {
            this.input.connect(dry);
            this.input.connect(ringer);

            oscillator.connect(ringer.gain);
            ringer.connect(wet)
            
            dry.connect(this.output);
            wet.connect(this.output);

            oscillator.start();
        }

        this.disable = () => {
            oscillator.stop();
            oscillator.disconnect();
            dry.disconnect();
            this.input.disconnect();
        }

    }
}
