import { NumberSynthParam, ParamType, SynthParam } from "./interfaces/SynthParam";
import { SynthVoice, EventParamsBase, Synth } from "./super/Synth";

interface KickSynthParams {
    startOctave: {value: number},
    decayTime: {value: number},
}

const kickVoice = (audioContext: AudioContext, synthParams: KickSynthParams): SynthVoice<EventParamsBase>  => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const distortion = audioContext.createWaveShaper();
    const output = gainNode;
    let eventStartedTime: number;
    let currentTargetFrequency: number;
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
        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            evtParams: EventParamsBase
        ) {
            this.inUse = true;
            eventStartedTime = absoluteStartTime;
            currentTargetFrequency = frequency;
            gainNode.gain.cancelScheduledValues(eventStartedTime);
            gainNode.gain.setValueAtTime(0, eventStartedTime);
            gainNode.gain.linearRampToValueAtTime(
                evtParams.velocity,
                eventStartedTime + 0.01
            );


            const ot = 2 ** (synthParams.startOctave.value - 1);
            oscillator.frequency.cancelScheduledValues(eventStartedTime);
            oscillator.frequency.setValueAtTime(
                frequency * ot, eventStartedTime
            );
            oscillator.frequency.linearRampToValueAtTime(
                frequency, eventStartedTime + synthParams.decayTime.value
            );

            return this;
        },
        scheduleEnd(absoluteStopTime: number) {
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
    startOctave: NumberSynthParam = {
        displayName: "start octave",
        type: ParamType.number,
        min: 0, max: 4,
        value: 2.273,
        exportable: true,
    }
    decayTime: NumberSynthParam = {
        displayName: "decay time",
        type: ParamType.number,
        min: 0, max: 2,
        value: 0.04,
        exportable: true,
    }
    params: SynthParam[];
    constructor(
        audioContext: AudioContext
    ) {
        super(audioContext, kickVoice);

        this.output.gain.value = 0.1;

        this.params = [
            this.startOctave,
            this.decayTime,
        ];


    }
}
