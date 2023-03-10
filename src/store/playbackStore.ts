import { defineStore } from 'pinia';
import * as Tone from "tone";
import { FMSynthOptions, MetalSynthOptions, MonoSynthOptions } from 'tone';
import { computed, reactive, ref, watchEffect } from 'vue';
import { Note } from '../dataTypes/Note';
import { useScoreStore } from './scoreStore';
import { useViewStore } from './viewStore';
import { OptionSynthParam, ParamType, SynthInstance, SynthParam } from "../toneSynths/Synthinterface"
import { ToneFmSynth } from '../toneSynths/FmSynth';
import { MagicSampler } from '../toneSynths/MagicSampler';
import sampleDefinitions from "../_autogenerated_samples"
import { AnyAudioContext } from 'tone/build/esm/core/context/AudioContext';

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

    const audioCotextPromise = Tone.start();
    let resolveSynthsReadyPromise = (v: any) => { };
    const synthsReadyPromise = new Promise((res) => {
        resolveSynthsReadyPromise = res;
    });

    const score = useScoreStore();
    const view = useViewStore();

    const playbarPxPosition = ref(0);
    const playFrameSizeMs = 30;

    const paused = computed(() => (!playing.value) && currentScoreTime.value != 0);
    const stopped = computed(() => (!playing.value) && currentScoreTime.value == 0);

    let toneFmSynth = null as ToneFmSynth | null;
    let sampler1 = null as MagicSampler | null;
    let sampler2 = null as MagicSampler | null;
    let sampler3 = null as MagicSampler | null;
    let availableSynths = ref([] as SynthInstance[]);

    let synth = ref<SynthInstance | undefined>(undefined);

    const startContextListener = async () => {
        await Tone.start();

        const toneAudioContext = Tone.context;

        // if (toneAudioContext.state === "suspended") {
        //     await toneAudioContext.resume();
        // }
        
        let audioContext = toneAudioContext.rawContext as AudioContext;

        sampler1 = new MagicSampler(
            audioContext,
            sampleDefinitions[0].samples,
            sampleDefinitions[0].name
        );
        sampler2 = new MagicSampler(
            audioContext,
            sampleDefinitions[1].samples,
            sampleDefinitions[1].name
        );
        sampler3 = new MagicSampler(
            audioContext,
            sampleDefinitions[2].samples,
            sampleDefinitions[2].name
        );
        toneFmSynth = new ToneFmSynth(audioContext);
        availableSynths.value = [toneFmSynth, sampler1, sampler2, sampler3];
        synth.value = toneFmSynth;
        resolveSynthsReadyPromise(null);
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
            if (!synth.value) throw new Error("synth not created");
            // TODO: is this all cancelling out and becoming now? too sleepy today to check
            const noteStartFromNow = note.start - currentScoreTime.value;
            const noteStart = now + noteStartFromNow;
            const relativeNoteStart = noteStart;
            const noteDuration = note.duration / rate;
            console.log(synth.value);
            try {
                synth.value.triggerAttackRelease(
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
    }

    const play = async () => {
        // console.log("play");
        if (audioContext.state !== 'running') await audioContext.resume();
        playing.value = true;
        if (currentTimeout.value) throw new Error("timeout already exists");
        previousClockTime.value = audioContext.currentTime;
        currentTimeout.value = setTimeout(_clockAction, 0);
    }

    const stop = () => {
        clearTimeout(currentTimeout.value);
        currentTimeout.value = null;
        playing.value = false;
        currentScoreTime.value = 0;
        previousScoreTime.value = 0;
        previousClockTime.value = 0;
        synth.value?.releaseAll();
    }

    const pause = () => {
        clearTimeout(currentTimeout.value);
        currentTimeout.value = null;
        playing.value = false;
    }

    const synthParams = computed(() => {
        if (!synth.value) return [];
        console.log(synth.value, availableSynths.value)
        return [
            {
                type: ParamType.option,
                displayName: "Synth",
                getter: () => {
                    console.log("synth getter", synth.value, availableSynths);
                    const ret = synth.value ? availableSynths.value.indexOf(
                        synth.value
                    ) : 0;
                    if (ret === -1) {
                        console.error("synth not found");
                        return 0;
                    }
                    return ret;
                },
                setter: (choiceNo: number) => {
                    console.log("synth setter", choiceNo);
                    synth.value = availableSynths.value[choiceNo];
                },
                options: availableSynths.value.map((s, index) => ({
                    value: index,
                    displayName: s.name,
                })),
            } as OptionSynthParam,
            ...synth.value.getParams()
        ];
    });

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
        synth,
        play,
        stop,
        pause,
        synthParams,
    };
});

