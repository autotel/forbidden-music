import { createMaximizerWorklet } from "../functions/maximizerWorkletFactory";
import { SynthParam } from "./interfaces/SynthParam";
import { EventParamsBase, Synth, SynthVoice } from "./super/Synth";


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
        scheduleEnd(absoluteEndTime: number) {
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
            return this;
        },
        stop() {
            const now = audioContext.currentTime;
            this.scheduleEnd(now);
        }
    };

}

type SineVoice = ReturnType<typeof sineVoice>;

export class SineSynth extends Synth<EventParamsBase, SineVoice> {
    voices: SineVoice[] = [];
    credits = "Simple sine synth by Autotel";
    constructor(
        audioContext: AudioContext,
    ) {
        super(audioContext, sineVoice);
        this.output.gain.value = 0.1;
        let maximizer: AudioNode | undefined;

        this.enable = async () => {
            if (!maximizer) {
                // TODO: fix how FX work and move maximizer out of here
                maximizer = await createMaximizerWorklet(audioContext);
            }
            maximizer.connect(this.output);
            this.isReady = true;
        }
        this.disable = () => {
            if (maximizer) {
                maximizer.disconnect();
            }
            this.isReady = false;
        }
    }
    releaseAll = () => {
        this.voices.forEach((voice) => {
            voice.stop();
        });
    }
    params = [] as SynthParam[];
}
