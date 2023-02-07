import { defineStore } from 'pinia';
import * as Tone from "tone";
import { FMSynthOptions, MetalSynthOptions, MonoSynthOptions } from 'tone';
import { computed, reactive, ref, watchEffect } from 'vue';
import { Note } from '../dataTypes/Note';
import { useScoreStore } from './scoreStore';
import { useViewStore } from './viewStore';
import { SynthInstance, SynthParam } from "../toneSynths/Synthinterface"
import { ToneFmSynth } from '../toneSynths/FmSynth';
import { MagicSampler } from '../toneSynths/MagicSampler';

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

    let synth = undefined as SynthInstance | undefined;

    const score = useScoreStore();
    const view = useViewStore();

    const playbarPxPosition = ref(0);
    const playFrameSizeMs = 30;

    const paused = computed(() => (!playing.value) && currentScoreTime.value != 0);
    const stopped = computed(() => (!playing.value) && currentScoreTime.value == 0);

    const toneFmSynth = new ToneFmSynth();
    const sampler = new MagicSampler();

    const startContextListener = async () => {
        await Tone.start()
        const [fmSynth, audioContext] = toneFmSynth.init();
        const [samplerSynth] = sampler.init(audioContext);
        synth = samplerSynth;
        console.log("audio is ready");
        window.removeEventListener("mousedown", startContextListener);
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
            if (!sampler.synth) throw new Error("synth not created");
            // TODO: is this all cancelling out and becoming now? too sleepy today to check
            const noteStartFromNow = note.start - currentScoreTime.value;
            const noteStart = now + noteStartFromNow;
            const relativeNoteStart = noteStart;
            const noteDuration = note.duration / rate;
            // console.log({ relativeNoteStart, noteDuration });
            try {
                sampler.synth.triggerAttackRelease(
                    note.frequency,
                    noteDuration,
                    relativeNoteStart,
                    0.7
                );
            } catch (e) {
                console.log("note play error", e);
            }
        });
        previousClockTime.value = now;

        if (currentTimeout.value) clearTimeout(currentTimeout.value);
        currentTimeout.value = setTimeout(_clockAction, playFrameSizeMs);

        previousScoreTime.value = currentScoreTime.value;

    };
    const play = async () => {
        // console.log("play");
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
        previousClockTime.value = 0;
        synth?.releaseAll();
    }
    const pause = () => {
        clearTimeout(currentTimeout.value);
        currentTimeout.value = null;
        playing.value = false;
    }

    const getSynthParams = async (): Promise<SynthParam[]> => {
        return await sampler.getParams();
    }

    watchEffect(() => {

        playbarPxPosition.value = view.timeToPxWithOffset(currentScoreTime.value);
    });
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

