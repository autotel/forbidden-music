import { createMaximizerWorklet } from "../../functions/maximizerWorkletFactory";
import { createAutomatableAudioNodeParam } from "../types/Automatable";
import { ParamType, SynthParam } from "../types/SynthParam";
import { EventParamsBase, Synth, SynthVoice } from "../types/Synth";


type SineNoteParams = EventParamsBase & {
    perc: boolean,
}

const sineVoice = (audioContext: AudioContext): SynthVoice => {

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
            console.log("sine synth start");
            noteVelocity = params.velocity;
            this.inUse = true;
            gainNode.gain.cancelScheduledValues(absoluteStartTime);
            // this synth is strange in the sense that the peak volume is 
            // scheduled in relation to the note duration
            gainNode.gain.setValueAtTime(0, absoluteStartTime);
            oscillator.frequency.value = frequency;
            oscillator.frequency.setValueAtTime(frequency, absoluteStartTime);
            noteStarted = absoluteStartTime;
            if (params.perc) {
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
        }
    };

}

type SineVoice = ReturnType<typeof sineVoice>;

export class SineSynth extends Synth<EventParamsBase, SineVoice> {
    voices: SineVoice[] = [];
    constructor(
        audioContext: AudioContext,
    ) {
        super(audioContext, sineVoice);
        const outputGain = this.output;
        this.output.gain.value = 0.1;
        this.voices = Array.from({ length: 4 }, () => sineVoice(audioContext));
        const gain = createAutomatableAudioNodeParam(
            outputGain.gain, 'gain', 0, 1
        );
        this.params.push(gain);
    }
    params = [] as SynthParam[];
}
