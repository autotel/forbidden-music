import * as Tone from "tone";
import { FMSynth, FMSynthOptions, Freeverb, PolySynth } from 'tone';
import { AnyAudioContext } from "tone/build/esm/core/context/AudioContext";
import { SynthInstance, SynthInterface, SynthParam } from "./Synthinterface";

export class ToneFmSynth implements SynthInterface {
    synth: PolySynth | undefined;
    reverb: Freeverb | undefined;
    private audioStartPromise;
    private audioStartResolve: (value: AnyAudioContext) => void = () => {
        throw new Error("Method not implemented correctly");
    }

    constructor() {
        this.audioStartPromise = new Promise((resolve) => {
            this.audioStartResolve = resolve;
        });
    }

    init() {
        this.synth = new Tone.PolySynth<Tone.FMSynth>(Tone.FMSynth)

        this.reverb = new Tone.Freeverb({
            wet: 0.2,
            roomSize: 0.7,
            dampening: 6000
        }).toDestination();

        this.synth.set({
            harmonicity: 17,
            modulationIndex: 91.83,
            detune: 0,
            oscillator: {
                type: "sine"
            },
            envelope: {
                attack: 0.01,
                decay: 10,
                sustain: 0.40,
                release: 0.5
            },
            modulation: {
                type: "square"
            },
            modulationEnvelope: {
                attack: 0.0,
                decay: 10,
                sustain: 0,
                release: 0.5
            },
            volume: -15,
        } as FMSynthOptions);
        this.synth.connect(this.reverb);
        this.audioStartResolve(Tone.context.rawContext);
        return [this.synth, Tone.context.rawContext] as [SynthInstance, AudioContext];
    }
    async getParams() {
        await this.audioStartPromise;
        if (!this.synth) throw new Error("synth not created");
        if (!this.reverb) throw new Error("reverb not created");
        const synthParams = this.synth.get() as FMSynthOptions;
        const reverbParams = this.reverb.get() as Tone.FreeverbOptions;

        const synth = this.synth;

        const reverbRetParams = [{
            displayName: "roomSize",
            getter: () => reverbParams.roomSize as number,
            setter: (n: number) => this.reverb?.set({ roomSize: n }),
            min: 0, max: 1,
        },
        {
            displayName: "dampening",
            getter: () => reverbParams.dampening as number,
            setter: (n: number) => this.reverb?.set({ dampening: n }),
            min: 0, max: 10000,
        },
        {
            displayName: "wet",
            getter: () => reverbParams.wet as number,
            setter: (n: number) => this.reverb?.set({ wet: n }),
            min: 0, max: 1,
        }];

        return [
            ...reverbRetParams,
            {
                displayName: "envelope.attack",
                getter: () => synthParams.envelope.attack as number,
                setter: (n: number) => synth?.set({ envelope: { attack: n } }),
                min: 0, max: 3,
            },
            {
                displayName: "envelope.decay",
                getter: () => synthParams.envelope.decay as number,
                setter: (n: number) => synth?.set({ envelope: { decay: n } }),
                min: 0, max: 10,
            },
            {
                displayName: "envelope.sustain",
                getter: () => synthParams.envelope.sustain as number,
                setter: (n: number) => synth?.set({ envelope: { sustain: n } }),
                min: 0, max: 1,
            },
            {
                displayName: "envelope.release",
                getter: () => synthParams.envelope.release as number,
                setter: (n: number) => synth?.set({ envelope: { release: n } }),
                min: 0, max: 10,
            },
            {
                displayName: "modulationIndex",
                getter: () => synthParams.modulationIndex as number,
                // @ts-ignore
                setter: (n: number) => synth?.set({ modulationIndex: n }),
                min: 0, max: 100,
            },
            {
                displayName: "harmonicity",
                getter: () => synthParams.harmonicity as number,
                // @ts-ignore
                setter: (n: number) => synth?.set({ harmonicity: n }),
                min: 0, max: 22,
            },
            {
                displayName: "volume",
                getter: () => synthParams.volume as number,
                setter: (n: number) => synth?.set({ volume: n }),
                min: -100, max: 0,
            },
        ] as SynthParam[]
    }
}