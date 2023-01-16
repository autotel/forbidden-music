import { defineStore } from 'pinia';
import * as Tone from "tone";
import { MonoSynthOptions } from 'tone';
import { computed, ref } from 'vue';
import { Note } from '../dataTypes/Note';
import { useScoreStore } from './scoreStore';
import { useViewStore } from './viewStore';

const SynthOfChoice = Tone.PluckSynth;

interface SynthParam {
    valueName: string;
    valueContainer: any;
    displayName?: string;
    min: number
    max: number
}



export const usePlaybackStore = defineStore("playback", () => {

    // TODO: many of these need not to be refs nor be exported.
    const playing = ref(false);
    // time units per second?
    const tempo = ref(10);
    /** in musical time */
    const currentScoreTime = ref(0);
    /** in musical time */
    const previousScoreTime = ref(0);
    const currentTimeout = ref(null as null | any);
    /** in seconds */
    const previousClockTime = ref(0);

    let audioContext = Tone.context;

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
        synth = new Tone.PolySynth(Tone.MonoSynth).toDestination();
        audioContext = Tone.context;
        synth.toDestination();
        console.log("audio is ready");
        window.removeEventListener("mousedown", startContextListener);
        if (!resolveAudioStart) throw new Error("resolveAudioStart not set");
        resolveAudioStart(false);
    }

    window.addEventListener("mousedown", startContextListener);

    const _getEventsBetween = (frameStartTime: number, frameEndTime: number) => {
        const events = score.notes.filter((event) => {
            return event.start >= frameStartTime && event.start < frameEndTime;
        });
        return events;
    };
    const _clockAction = () => {
        if (!audioContext) throw new Error("audio context not created");
        const now = Tone.now();
        const deltaTime = now - previousClockTime.value;
        currentScoreTime.value += deltaTime * tempo.value;
        const playNotes = _getEventsBetween(previousScoreTime.value, currentScoreTime.value);


        playNotes.forEach((note: Note) => {
            if (!synth) throw new Error("synth not created");
            // TODO: is this all cancelling out and becoming now? too sleepy today to check
            const noteStartFromNow = note.start - currentScoreTime.value;
            const noteStart = now + noteStartFromNow;
            const relativeNoteStart = noteStart;
            const noteDuration = note.duration / tempo.value;
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
        const synthParams = synth.get() as MonoSynthOptions;
        return [
            {
                valueName: "attack",
                valueContainer: synthParams.envelope,
                min: 0, max: 1,
            },
            {
                valueName: "decay",
                valueContainer: synthParams.envelope,
                min: 0, max: 1,
            },
            {
                valueName: "sustain",
                valueContainer: synthParams.envelope,
                min: 0, max: 1,
            },
            {
                valueName: "release",
                valueContainer: synthParams.envelope,
                min: 0, max: 1,
            },
            {
                valueName: "attack",
                displayName:"f.attack",
                valueContainer: synthParams.filterEnvelope,
                min: 0, max: 1,
            },
            {
                valueName: "decay",
                displayName:"f.decay",
                valueContainer: synthParams.filterEnvelope,
                min: 0, max: 1,
            },
            {
                valueName: "sustain",
                displayName:"f.sustain",
                valueContainer: synthParams.filterEnvelope,
                min: 0, max: 1,
            },
            {
                valueName: "release",
                displayName:"f.release",
                valueContainer: synthParams.filterEnvelope,
                min: 0, max: 1,
            },
            // {
            //     valueName: "f.baseFrequency",
            //     valueContainer: synthParams.filterEnvelope,
            //     min: 0, max: 1000,
            // },
            // {
            //     valueName: "f.exponent",
            //     valueContainer: synthParams.filterEnvelope,
            //     min: 0, max: 10,
            // },
            // {
            //     valueName: "f.Q",
            //     valueContainer: synthParams.filter,
            //     min: 0, max: 10,
            // },
            // {
            //     valueName: "f.type",
            //     valueContainer: synthParams.filter,
            //     min: 0, max: 10,
            // },
            // {
            //     valueName: "f.detune",
            //     valueContainer: synthParams.filter,
            //     min: 0, max: 1000,
            // },
            // {
            //     valueName: "f.rolloff",
            //     valueContainer: synthParams.filter,
            //     min: -12, max: 0,
            // },
            // {
            //     valueName: "f.hum",
            //     valueContainer: synthParams.filter,
            //     min: -100, max: 0,
            // },
            // {
            //     valueName: "f.spread",
            //     valueContainer: synthParams.filter,
            //     min: 0, max: 100,
            // },
            // {
            //     valueName: "f.count",
            //     valueContainer: synthParams.filter,
            //     min: 0, max: 100,
            // },
            // {
            //     valueName: "f.min",
            //     valueContainer: synthParams.filter,
            //     min: 0, max: 100,
            // },
            // {
            //     valueName: "f.max",
            //     valueContainer: synthParams.filter,
            //     min: 0, max: 100,
            // },
            // {
            //     valueName: "f.wet",
            //     valueContainer: synthParams.filter,
            //     min: 0, max: 1,
            // },
            // {
            //     valueName: "f.dry",
            //     valueContainer: synthParams.filter,
            //     min: 0, max: 1,
            // },
            // {
            //     valueName: "f.gain",
            //     valueContainer: synthParams.filter,
            //     min: 0, max: 1,
            // }
        ];

    }


    return {
        playing,
        tempo,
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

