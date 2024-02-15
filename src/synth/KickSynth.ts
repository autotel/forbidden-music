import { Synth } from "./super/Synth";
import { EventParamsBase, NumberSynthParam, ParamType, SynthInstance, SynthParam, SynthVoice } from "./super/SynthInterface";


const kickVoice = (audioContext: AudioContext): SynthVoice<EventParamsBase> & {
    decayTime: number,
    startOctave: number,
} => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const distortion = audioContext.createWaveShaper();
    const output = gainNode;
    let eventStartedTime: number;
    let currentTargetFrequency: number;
    let currentEventParams = {
        velocity: 0,
    } as EventParamsBase;
    oscillator.connect(gainNode);
    oscillator.start();

    const releaseVoice = (v: { inUse: boolean }) => {
        gainNode.gain.cancelScheduledValues(audioContext.currentTime);
        // firefox has a bit of a hard time with this stuff
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.value = 0;
        v.inUse = false;
    }



    return {
        inUse: false,
        output,
        decayTime: 0.04,
        startOctave: 2.273,
        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            params: EventParamsBase
        ) {
            this.inUse = true;
            currentEventParams = params;
            eventStartedTime = absoluteStartTime;
            currentTargetFrequency = frequency;
            gainNode.gain.cancelScheduledValues(eventStartedTime);
            gainNode.gain.setValueAtTime(0, eventStartedTime);
            gainNode.gain.linearRampToValueAtTime(
                params.velocity,
                eventStartedTime + 0.01
            );


            const ot = 2 ** (this.startOctave - 1);
            oscillator.frequency.cancelScheduledValues(eventStartedTime);
            oscillator.frequency.setValueAtTime(
                frequency * ot, eventStartedTime
            );
            oscillator.frequency.linearRampToValueAtTime(
                frequency, eventStartedTime + this.decayTime
            );

            return this;
        },
        scheduleEnd(absoluteStopTime: number) {
            const { velocity } = currentEventParams;
            const duration = absoluteStopTime - eventStartedTime;
            gainNode.gain.linearRampToValueAtTime(0, eventStartedTime + duration);
            setTimeout(() => {
                releaseVoice(this);
            }, duration * 1000);
            return this;
        },

        stop() {
            releaseVoice(this);
            return this;
        }
    }
}

type KickVoice = ReturnType<typeof kickVoice>;

export class KickSynth extends Synth<EventParamsBase, KickVoice>{
    startOctaveParam: NumberSynthParam = {
        displayName: "start octave",
        type: ParamType.number,
        min: 0, max: 4,
        value: 2.273,
        exportable: true,
    }
    decayTimeParam: NumberSynthParam = {
        displayName: "decay time",
        type: ParamType.number,
        min: 0, max: 2,
        value: 0.04,
        exportable: true,
    }
    params: SynthParam[];
    name: string = "KickSynth";
    constructor(
        audioContext: AudioContext
    ) {
        super(audioContext, kickVoice);

        this.output.gain.value = 0.1;

        this.params = [
            this.startOctaveParam,
            this.decayTimeParam,
        ];


    }
}
