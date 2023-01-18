import { defineStore } from 'pinia';
import * as Tone from "tone";
import { FMSynthOptions, MetalSynthOptions, MonoSynthOptions } from 'tone';
import { computed, reactive, ref } from 'vue';
import { Note } from '../dataTypes/Note';
import { useScoreStore } from './scoreStore';
import { useViewStore } from './viewStore';

const SynthOfChoice = Tone.PluckSynth;

export interface SynthParam {
    getter: () => number;
    setter: (n: number) => void;
    displayName: string;
    min: number
    max: number
}

export const usePlaybackStore = defineStore("playback", () => {

    // TODO: many of these need not to be refs nor be exported.
    const playing = ref(false);
    // time units per second?
    const bpm = ref(110);
    /** in musical time */
    const currentScoreTime = ref(0);
    /** in musical time */
    const previousScoreTime = ref(0);
    const currentTimeout = ref(null as null | any);
    /** in seconds */
    const previousClockTime = ref(0);

    let audioContext = Tone.context;

    let reverb = undefined as Tone.Freeverb | undefined;
    let synth = undefined as Tone.PolySynth<any> | undefined;

    const score = useScoreStore();
    const view = useViewStore();

    const playbarPxPosition = ref(0);
    const playFrameSizeMs = 30;

    const paused = computed(() => (!playing.value) && currentScoreTime.value != 0);
    const stopped = computed(() => (!playing.value) && currentScoreTime.value == 0);


    let resolveAudioStart = false as false | ((n: any) => void);

    const audioStartPromise = new Promise((resolve) => {
        resolveAudioStart = resolve;
    });

    const startContextListener = async () => {
        await Tone.start()
        reverb = new Tone.Freeverb({
            wet: 0.3,
            roomSize: 0.7,
            dampening: 3000
        }).toDestination();
        // synth = new Tone.PolySynth(Tone.MetalSynth).connect(reverb);
        // synth.set({
        //     resonance: 986,
        //     octaves: 0.5,
        //     harmonicity: 64,
        //     modulationIndex: 32,
        //     envelope: {
        //         attack: 0.001,
        //         decay: 1.4,
        //         sustain: 0.4,
        //         release: 0.2
        //     },
        // } as MetalSynthOptions);
        synth = new Tone.PolySynth(Tone.FMSynth).connect(reverb);
        synth.set({
            harmonicity: 3.01,
            modulationIndex: 14,
            detune: 0,
            oscillator: {
                type: "sine"
            },
            envelope: {
                attack: 0.01,
                decay: 0.01,
                sustain: 1,
                release: 0.5
            },
            modulation: {
                type: "square"
            },
            modulationEnvelope: {
                attack: 0.5,
                decay: 0,
                sustain: 1,
                release: 0.5
            }
        } as FMSynthOptions);

        audioContext = Tone.context;
        synth.toDestination();
        console.log("audio is ready");
        window.removeEventListener("mousedown", startContextListener);
        if (!resolveAudioStart) throw new Error("resolveAudioStart not set");
        resolveAudioStart(false);
        console.log(synth, synth.get());
    }

    window.addEventListener("mousedown", startContextListener);

    const _getEventsBetween = (frameStartTime: number, frameEndTime: number) => {
        const events = score.notes.filter((event) => {
            return event.start >= frameStartTime && event.start < frameEndTime;
        });
        return events;
    };
    const _clockAction = () => {
        const rate = bpm.value / 60;

        if (!audioContext) throw new Error("audio context not created");
        const now = Tone.now();
        const deltaTime = now - previousClockTime.value;
        currentScoreTime.value += deltaTime * rate;
        const playNotes = _getEventsBetween(previousScoreTime.value, currentScoreTime.value);


        playNotes.forEach((note: Note) => {
            if (!synth) throw new Error("synth not created");
            // TODO: is this all cancelling out and becoming now? too sleepy today to check
            const noteStartFromNow = note.start - currentScoreTime.value;
            const noteStart = now + noteStartFromNow;
            const relativeNoteStart = noteStart;
            const noteDuration = note.duration / rate;
            console.log({ relativeNoteStart, noteDuration });
            synth.triggerAttackRelease(note.frequency,
                noteDuration,
                relativeNoteStart,
                0.7
            );
        });
        previousClockTime.value = now;

        if (currentTimeout.value) clearTimeout(currentTimeout.value);
        currentTimeout.value = setTimeout(_clockAction, playFrameSizeMs);

        previousScoreTime.value = currentScoreTime.value;

        // TODO: mapping direction weirdness :/ 
        playbarPxPosition.value = view.timeToPxWithOffset(currentScoreTime.value);
    };
    const play = async () => {
        if (audioContext.state !== 'running') await audioContext.resume();

        playing.value = true;
        if (currentTimeout.value) throw new Error("timeout already exists");
        previousClockTime.value = audioContext.currentTime;
        currentTimeout.value = setTimeout(_clockAction, 0);
    };
    const stop = () => {
        clearTimeout(currentTimeout.value);
        currentTimeout.value = null;
        playing.value = false;
        currentScoreTime.value = 0;
        previousScoreTime.value = 0;
        playbarPxPosition.value = 0;
        previousClockTime.value = 0;
        synth?.releaseAll();
    }
    const pause = () => {
        clearTimeout(currentTimeout.value);
        currentTimeout.value = null;
        playing.value = false;
    }

    const getSynthParams = async (): Promise<SynthParam[]> => {
        await audioStartPromise;
        if (!synth) throw new Error("synth not created");
        if (!reverb) throw new Error("reverb not created");
        const synthParams = synth.get() as MetalSynthOptions;
        const reverbParams = reverb.get() as Tone.FreeverbOptions;
        const reverbRetParams = [{
            displayName: "roomSize",
            getter: () => reverbParams.roomSize as number,
            setter: (n: number) => reverb?.set({ roomSize: n }),
            min: 0, max: 1,
        },
        {
            displayName: "dampening",
            getter: () => reverbParams.dampening as number,
            setter: (n: number) => reverb?.set({ dampening: n }),
            min: 0, max: 10000,
        },
        {
            displayName: "wet",
            getter: () => reverbParams.wet as number,
            setter: (n: number) => reverb?.set({ wet: n }),
            min: 0, max: 1,
        }];

        /* 
        envelope : {
            attack : Time	
            decay : Time	
            release : Time	
            sustain : NormalRange	
        }
        harmonicity : Positive	from 0 to 64
        modulation : {
            frequency : Frequency from 0 to 20000
            volume: Decibels from -100 to 0
        }	
        modulationEnvelope : {
            attack : Time	
            decay : Time	
            release : Time	
            sustain : NormalRange	
        }
        modulationIndex : Positive from 0 to 100
        oscillator : {
            frequency : Frequency from 0 to 20000
            volume: Decibels from -100 to 0
        }		
        portamento : Seconds	
        volume : Decibels	
        */
        return [
            ...reverbRetParams,
            {
                displayName: "envelope.attack",
                getter: () => synthParams.envelope.attack as number,
                setter: (n: number) => synth?.set({ envelope: { attack: n } }),
                min: 0, max: 1,
            },
            {
                displayName: "envelope.decay",
                getter: () => synthParams.envelope.decay as number,
                setter: (n: number) => synth?.set({ envelope: { decay: n } }),
                min: 0, max: 1,
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
                min: 0, max: 1,
            },
            {
                displayName: "modulationIndex",
                getter: () => synthParams.modulationIndex as number,
                setter: (n: number) => synth?.set({ modulationIndex: n }),
                min: 0, max: 100,
            },
            {
                displayName: "harmonicity",
                getter: () => synthParams.harmonicity as number,
                setter: (n: number) => synth?.set({ harmonicity: n }),
                min: 0, max: 22,
            },
            {
                displayName: "volume",
                getter: () => synthParams.volume as number,
                setter: (n: number) => synth?.set({ volume: n }),
                min: -100, max: 0,
            },
        ];

        // return [

        //     {
        //         displayName: "resonance",
        //         getter: () => synthParams.resonance as number,
        //         setter: (n: number) => synth?.set({ resonance: n }),
        //         min: 0, max: 8000,
        //     },
        //     {
        //         displayName: "octaves",
        //         getter: () => synthParams.octaves as number,
        //         setter: (n: number) => synth?.set({ octaves: n }),
        //         min: 0, max: 1,
        //     },
        //     {
        //         displayName: "harmonicity",
        //         getter: () => synthParams.harmonicity as number,
        //         setter: (n: number) => synth?.set({ harmonicity: n }),
        //         min: 0, max: 64,
        //     },
        //     {
        //         displayName: "modulationIndex",
        //         getter: () => synthParams.modulationIndex as number,
        //         setter: (n: number) => synth?.set({ modulationIndex: n }),
        //         min: 0, max: 256,
        //     },
        //     {
        //         displayName: "envelope.attack",
        //         getter: () => synthParams.envelope.attack as number,
        //         setter: (n: number) => synth?.set({ envelope: { attack: n } }),
        //         min: 0, max: 1,
        //     },
        //     {
        //         displayName: "envelope.decay",
        //         getter: () => synthParams.envelope.decay as number,
        //         setter: (n: number) => synth?.set({ envelope: { decay: n } }),
        //         min: 0, max: 1,
        //     },
        //     {
        //         displayName: "envelope.sustain",
        //         getter: () => synthParams.envelope.sustain as number,
        //         setter: (n: number) => synth?.set({ envelope: { sustain: n } }),
        //         min: 0, max: 1,
        //     },
        //     {
        //         displayName: "envelope.release",
        //         getter: () => synthParams.envelope.release as number,
        //         setter: (n: number) => synth?.set({ envelope: { release: n } }),
        //         min: 0, max: 1,
        //     },

        // ];
        // monosynth
        // const synthParams = synth.get() as MonoSynthOptions;
        // return [
        //     {
        //         displayName: "attack",
        //         getter: () => synthParams.envelope.attack as number,
        //         setter: (n: number) => synth?.set({ envelope: { attack: n } }),
        //         min: 0, max: 1,
        //     },
        //     {
        //         displayName: "decay",
        //         getter: () => synthParams.envelope.decay as number,
        //         setter: (n: number) => synth?.set({ envelope: { decay: n } }),
        //         min: 0, max: 1,
        //     },
        //     {
        //         displayName: "sustain",
        //         getter: () => synthParams.envelope.sustain as number,
        //         setter: (n: number) => synth?.set({ envelope: { sustain: n } }),
        //         min: 0, max: 1,
        //     },
        //     {
        //         displayName: "release",
        //         getter: () => synthParams.envelope.release as number,
        //         setter: (n: number) => synth?.set({ envelope: { release: n } }),
        //         min: 0, max: 1,
        //     },
        //     {
        //         displayName: "filter attack",
        //         getter: () => synthParams.filterEnvelope.attack as number,
        //         setter: (n: number) => synth?.set({ filterEnvelope: { attack: n } }),
        //         min: 0, max: 1,
        //     },
        //     {
        //         displayName: "filter decay",
        //         getter: () => synthParams.filterEnvelope.decay as number,
        //         setter: (n: number) => synth?.set({ filterEnvelope: { decay: n } }),
        //         min: 0, max: 1,
        //     },
        //     {
        //         displayName: "filter sustain",
        //         getter: () => synthParams.filterEnvelope.sustain as number,
        //         setter: (n: number) => synth?.set({ filterEnvelope: { sustain: n } }),
        //         min: 0, max: 1,
        //     },
        //     {
        //         displayName: "filter release",
        //         getter: () => synthParams.filterEnvelope.release as number,
        //         setter: (n: number) => synth?.set({ filterEnvelope: { release: n } }),
        //         min: 0, max: 1,
        //     },
        //     {
        //         displayName: "filter Q",
        //         getter: () => synthParams.filter.Q as number,
        //         setter: (n: number) => synth?.set({ filter: { Q: n } }),
        //         min: 0, max: 20,
        //     },
        //     {
        //         displayName: "filter env baseFrequency",
        //         getter: () => synthParams.filterEnvelope.baseFrequency as number,
        //         setter: (n: number) => synth?.set({ filter: { frequency: n } }),
        //         min: 0, max: 20000,
        //     },
        //     {
        //         displayName: "filter env octaves",
        //         getter: () => synthParams.filterEnvelope.octaves as number,
        //         setter: (n: number) => synth?.set({ filter: { frequency: n } }),
        //         min: 0, max: 5,
        //     },
        // ];
    }


    return {
        playing,
        bpm,
        currentScoreTime,
        previousScoreTime,
        currentTimeout,
        audioContext,
        playbarPxPosition,
        paused,
        stopped,
        play,
        stop,
        pause,
        getSynthParams,
    };
});

