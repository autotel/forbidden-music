import { createMaximizerWorklet } from "../../functions/maximizerWorkletFactory";
import { automatableNumberSynthParam } from "../types/Automatable";
import { BooleanSynthParam, ParamType, SynthParam } from "../types/SynthParam";
import { EventParamsBase, Synth, SynthVoice } from "../types/Synth";


type SineNoteParams = EventParamsBase & {
    perc: boolean,
}

type ProportionalAttackRef = {
    value: boolean;
}

const sineVoice = (audioContext: AudioContext, proportionalAttackRef: ProportionalAttackRef): SynthVoice => {

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    let noteStarted = 0;
    let noteVelocity = 0;
    oscillator.connect(gainNode);
    oscillator.start();

    return {
        inUse: false,
        output: gainNode,
        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            params: SineNoteParams
        ) {
            noteVelocity = params.velocity;
            this.inUse = true;
            gainNode.gain.cancelScheduledValues(absoluteStartTime);
            // this synth is strange in the sense that the peak volume is
            // scheduled in relation to the note duration
            gainNode.gain.setValueAtTime(0, absoluteStartTime);
            oscillator.frequency.value = frequency;
            oscillator.frequency.setValueAtTime(frequency, absoluteStartTime);
            noteStarted = absoluteStartTime;
            // Use fast attack if perc is true OR if proportional attack is disabled
            if (params.perc || !proportionalAttackRef.value) {
                gainNode.gain.setValueAtTime(
                    noteVelocity, absoluteStartTime
                );
            }
            return this;
        },
        scheduleEnd(absoluteEndTime?: number) {
            if (absoluteEndTime) {
                const noteDuration = absoluteEndTime - noteStarted;
                gainNode.gain.cancelScheduledValues(absoluteEndTime);
                gainNode.gain.linearRampToValueAtTime(noteVelocity, noteStarted + noteDuration / 4);
                // firefox has a bit of a hard time with this stuff
                gainNode.gain.linearRampToValueAtTime(0, absoluteEndTime);
                setTimeout(() => {
                    gainNode.gain.cancelScheduledValues(audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                    this.inUse = false;
                }, (absoluteEndTime - audioContext.currentTime) * 1000 + 10);
            } else {
                gainNode.gain.cancelScheduledValues(audioContext.currentTime);
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                this.inUse = false;
            }
            return this;
        },
        scheduleModification(mods, time) {
            if(mods.frequency) {
                oscillator.frequency.setValueAtTime(mods.frequency, time);
            }
            if(mods.velocity) {
                gainNode.gain.setValueAtTime(mods.velocity, time);
            }
        }
    };

}

type SineVoice = ReturnType<typeof sineVoice>;

export class SineSynth extends Synth<EventParamsBase, SineVoice> {
    voices: SineVoice[] = [];
    proportionalAttackRef: ProportionalAttackRef = { value: true };

    constructor(
        audioContext: AudioContext,
    ) {
        super(audioContext, (ac) => sineVoice(ac, this.proportionalAttackRef));
        const outputGain = this.output;
        this.output.gain.value = 0.1;
        this.voices = Array.from({ length: 4 }, () => sineVoice(audioContext, this.proportionalAttackRef));
        

        const parent = this;
        this.params.push({
            displayName: "Proportional Attack",
            type: ParamType.boolean,
            get value() {
                return parent.proportionalAttackRef.value;
            },
            set value(value: boolean) {
                parent.proportionalAttackRef.value = value;
            },
            exportable: true,
        } as BooleanSynthParam);

        const gain = automatableNumberSynthParam(
            outputGain.gain, 'gain', 0, 1
        );
        this.params.push(gain);
    }
    params = [] as SynthParam[];
}
