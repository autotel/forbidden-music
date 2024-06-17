import { AudioModule } from "./interfaces/AudioModule";
import { NumberSynthParam, ParamType, SynthParam } from "./interfaces/SynthParam";
import { ReceivesNotes, Synth } from "./super/Synth";
type AdmissibleSynthType = AudioModule | Synth | AudioModule;
export class ParallelChain {
    params: SynthParam[] = [];
    enable: () => void;
    disable: () => void;
    output: GainNode;
    input: GainNode;
    stack: AdmissibleSynthType[] = [];
    noteReceivers: ReceivesNotes[] = [];
    constructor(audioContext: AudioContext){
        this.enable = () => { };
        this.disable = () => { };
        this.output = audioContext.createGain();
        this.input = audioContext.createGain();
    }

    addParamForModuleGain = (module: AdmissibleSynthType) => {
        if (!(module.output instanceof GainNode)) return;
        const outputNode = module.output;
        const param = {
            displayName: `${module.name} gain`,
            type: ParamType.number,
            defaultValue: module.output.gain.value,
            min: 0,
            max: 1,
            set value(v: number) {
                outputNode.gain.value = v;
            },
            get value() {
                return outputNode.gain.value;
            },
            exportable: true,
            _target: module,
        } as NumberSynthParam;
        this.params.push(param);
    }

    addModule(module: AdmissibleSynthType) {
        this.stack.push(module);
        if (module.input) this.input.connect(module.input);
        if (module.output) module.output.connect(this.output);
        if ('receivesNotes' in module) this.noteReceivers.push(module);
        this.addParamForModuleGain(module);
    }

    removeModule(module: AdmissibleSynthType) {
        this.stack = this.stack.filter(m => m !== module);
        this.noteReceivers = this.noteReceivers.filter(m => m !== module);
        if (module.input) this.input.disconnect(module.input);
        if (module.output) module.output.disconnect(this.output);
        this.params = this.params.filter(p => p._target !== module);
    }
}
