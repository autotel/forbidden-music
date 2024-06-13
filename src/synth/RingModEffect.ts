import { AudioModule } from "./interfaces/AudioModule";
import { ParamType, SynthParam } from "./interfaces/SynthParam";

export class RingModEffect implements AudioModule {
    output: GainNode;
    input: GainNode;
    enable: () => void;
    disable: () => void;
    params: SynthParam[];

    constructor(
        audioContext: AudioContext,
    ) {
        audioContext;

        this.output = audioContext.createGain();
        this.input = audioContext.createGain();

        const dry = audioContext.createGain();
        dry.gain.value = 0;
        const oscillator = audioContext.createOscillator();
        // Id' like to have noise too, but its not available. Later I could think of using periodic wave?
        oscillator.type = "sine";

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
            displayName: "Dry gain",
            set value(v: number) {
                dry.gain.value = v;
            },
            get value() {
                return dry.gain.value;
            },
            min: 0,
            max: 1,
            exportable: true,
        
        }];

        this.enable = async () => {
            this.input.connect(this.output);
            oscillator.connect(this.input.gain);
            this.input.connect(dry);
            dry.connect(this.output);
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
