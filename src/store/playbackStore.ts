
import { devWarn } from '@/functions/isDev';
import { defineStore } from 'pinia';
import { computed, ref, watch, watchEffect } from 'vue';
import { AutomationPoint, automationRangeToParamRange } from '../dataTypes/AutomationPoint';
import { Loop } from "../dataTypes/Loop";
import { Note } from "../dataTypes/Note";
import { getDuration } from "../dataTypes/TimelineItem";
import { Trace, TraceType } from "../dataTypes/Trace";
import isTauri, { tauriObject } from '../functions/isTauri';
import devMidiInputHandler from '../midiInputHandlers/log';
import octatrackMidiInputHandler from '../midiInputHandlers/octatrack';
import reaperMidiInputHandler from '../midiInputHandlers/reaper';
import { addAutomationDestinationPoint, AutomatableSynthParam, isAutomatable, stopAndResetAnimations } from '../synth/types/Automatable';
import { useAudioContextStore } from "./audioContextStore";
import { useAutomationLaneStore } from './automationLanesStore';
import { useLayerStore } from './layerStore';
import { HierarchicalLoop, useLoopsStore } from './loopsStore';
import { useNotesStore } from './notesStore';
import { useSynthStore } from './synthStore';
import { useViewStore } from './viewStore';


interface MidiInputInterface {
    displayName: string;
    start: () => Promise<void>;
    stop: () => void;
    onmidimessage: (data: number[], timeStamp: number) => void;
}

interface MidiMessageEvent {
    event: "midi_message",
    windowLabel: string,
    payload: {
        message: number[]
    },
    id: number
}


interface MidiConnectionMode {
    name: string;
    notes: string[];
    inputAction: (midi: number[], timeStamp?: number) => void;
}

const getMidiInputsArray = async (): Promise<MidiInputInterface[]> => {
    let returnValues = [] as MidiInputInterface[];
    if (isTauri()) {
        const { invoke, listen } = await tauriObject();
        const devices = await invoke('list_midi_connections')
        const devicesObject = devices as { [key: string]: string }
        console.log("midi devs from rust", devices);

        const midiConnectionKeys = Object.keys(devicesObject as {})
        midiConnectionKeys.forEach((ck) => {
            const asInt = parseInt(ck);
            const newObject = {
                displayName: devicesObject[ck] ?? ck ?? 'unknown',
                start: async () => {
                },
                stop: () => {
                    console.warn("close function not implemented");
                    // invoke('close_midi_connection', { inputIdx: asInt });
                }
            } as MidiInputInterface;
            newObject.start = async () => {
                listen('midi_message', (event: unknown) => {
                    const eventTyped = event as MidiMessageEvent;
                    newObject.onmidimessage(eventTyped.payload.message, 0)
                })
                await invoke('open_midi_connection', { inputIdx: asInt });
            }
            returnValues.push(newObject);
        })



    } else {
        //@ts-ignore
        if (!navigator.requestMIDIAccess) return console.warn("no midi access possible");
        //@ts-ignore
        const midiAccess = await navigator.requestMIDIAccess();
        //@ts-ignore
        const inputs = [] as MIDIInput[];
        //@ts-ignore
        midiAccess.inputs.forEach((input) => {
            inputs.push(input);
            let inputObject = {
                displayName: input.name,
                start: async () => {
                    await input.open();
                },
                stop: () => {
                    input.close();
                },
                onmidimessage: (data: number[] | Uint8Array, timeStamp: number) => {
                }
            } as MidiInputInterface;
            returnValues.push(inputObject);
        });

    }
    return returnValues;
}


export const usePlaybackStore = defineStore("playback", () => {
    const automation = useAutomationLaneStore();
    const audioContextStore = useAudioContextStore();
    const loops = useLoopsStore();
    const synth = useSynthStore();
    const notes = useNotesStore();
    const layers = useLayerStore();
    // TODO: many of these need not to be refs nor be exported.
    const playing = ref(false);
    // time units per second?
    const bpm = ref(110);
    /** in musical time */
    const currentScoreTime = ref(0);
    const currentTimeout = ref(null as null | any);
    /** where does the playback return to when playback stops */
    const timeReturnPoint = ref(0);
    /** in seconds */
    let previousClockTime = 0;

    const view = useViewStore();

    const playbarPxPosition = ref(0);
    const playFrameSizeMs = 30;

    const paused = computed(() => (!playing.value) && currentScoreTime.value != 0);
    const stopped = computed(() => (!playing.value) && currentScoreTime.value == 0);

    const midiInputs = ref([] as MidiInputInterface[]);
    const currentMidiInput = ref<MidiInputInterface | null>(null);

    const clockTicker = () => {
        if (playing.value) {
            // _clockAction();
        }
    }

    const inputHandlerParams = [
        clockTicker, () => play(), () => stop(), (to: number) => currentScoreTime.value = to
    ] as const;

    const midiConectionModes = [
        octatrackMidiInputHandler(...inputHandlerParams),
        reaperMidiInputHandler(...inputHandlerParams),
        devMidiInputHandler(...inputHandlerParams),
    ] as MidiConnectionMode[];

    const currentMidiConnectionMode = ref(midiConectionModes[0]);

    getMidiInputsArray().then((inputs) => {
        if (!inputs) throw new Error("Midi inputs suceeded with null value");
        midiInputs.value = inputs;
        currentMidiInput.value = midiInputs.value[midiInputs.value.length - 1];
    }).catch((e) => {
        console.error("Could not access midi inputs", e);
    });

    const onmidimessage = (data: number[], timeStamp: number) => {
        if (data) {
            currentMidiConnectionMode.value.inputAction(data, timeStamp);
        } else {
            console.warn("unexpected midi event shape", data, timeStamp)
        }
    }
    watch(currentMidiInput, (newMidiInput, oldMidiInput) => {
        if (newMidiInput) {
            console.log("activating midi input");
            newMidiInput.onmidimessage = (data: number[], timeStamp: number) => {
                onmidimessage(data, timeStamp);
            };
            newMidiInput.start();
        }

        if (oldMidiInput) {
            console.log("deactivating midi input");
            oldMidiInput.onmidimessage = () => { };
            oldMidiInput.stop();
        }
    });


    const getNotesBetween = (frameStartTime: number, frameEndTime: number, catchUp = false) => {
        const events = notes.list.filter((editNote) => {
            if (layers.isMute(editNote.layer)) return false;
            return (catchUp ? editNote.timeEnd : editNote.time) >= frameStartTime && editNote.time < frameEndTime;
        });
        return events;
    };

    const catchUpAutomations = (scoreTime: number) => {
        const catchUpAutomations = new Map<AutomatableSynthParam, AutomationPoint>();
        const filteredAutomations = automation.getAutomationsAroundTime(scoreTime);
        for (let [lane, contents] of filteredAutomations) {
            const param = lane.targetParameter;
            if (!param) continue;
            for (let point of contents) {
                const prevAutomation = catchUpAutomations.get(param);
                if (prevAutomation) {
                    const interpolated = automation.getValueBetweenTwoPoints(
                        prevAutomation, point, scoreTime
                    );
                    param.value = automationRangeToParamRange(interpolated, {
                        min: param.min, max: param.max
                    });
                } else {
                    catchUpAutomations.set(param, point);
                }
            }
        }
    }

    let isFirtClockAfterPlay = true;
    let loopNow: Loop | undefined;
    let loopNowHierarchical: HierarchicalLoop | undefined;
    let lastLoopAtPlayhead: Loop | undefined;
    const musicalTimeToWebAudioTime = (musicalTime: number) => {
        const rate = bpm.value / 60;
        return musicalTime / rate;
    }
    const webAudioTimeToMusicalTime = (webAudioTime: number) => {
        const rate = bpm.value / 60;
        return webAudioTime * rate;
    }


    let loopToJumpTo = ref<Loop | false>(false);

    const enqueueLoop = (loop: Loop) => {
        loopToJumpTo.value = loop;
        console.log("loop to jump to", {
            playing: playing.value,
            loopNowHierarchical,
            loopNow,
        });
        if (!(playing.value && loopNowHierarchical)) {
            currentScoreTime.value = loopToJumpTo.value.time;
            play();
        }
    }

    const jumpToJumpLoop = (remainder: number, remainderNotesArray: Trace[]) => {
        if (!loopToJumpTo.value) return;
        const loopTo = loopToJumpTo.value;
        loopToJumpTo.value = false;
        // feature is not working 
        remainder = 0;
        if (remainder > 0) {
            const jumpLoopStartNotes = getNotesBetween(loopTo.time, loopTo.time + remainder);
            remainderNotesArray.push(...jumpLoopStartNotes);
        }

        currentScoreTime.value = loopTo.time + remainder;
        loops.resetLoopRepetitions();
        loopNowHierarchical = loops.getLoopToPlay(currentScoreTime.value);
    }

    const _clockAction = () => {
        const audioContext = audioContextStore.audioContext;
        if (!audioContext) throw new Error("audio context not created");

        loopNowHierarchical = loops.getLoopToPlay(currentScoreTime.value);
        loopNow = loopNowHierarchical?.value;
        // If I do this, left plays are discounted when going back from deeper to higher loops
        if (loopNowHierarchical && loopNow !== lastLoopAtPlayhead) {
            // enteredNewLoop = true;
            // loopNow?.repetitionsLeft && loopNow.repetitionsLeft--;
            if (loopToJumpTo.value) {
                jumpToJumpLoop(0, []);
            }
        }
        lastLoopAtPlayhead = loopNow;

        // reference time to consider as zero towards each event to be queued
        const tickTime = audioContext.currentTime;
        const deltaTime = tickTime - previousClockTime;

        // notes time with respect to which we measure -t towards each event
        const scoreTimeFrameStart = currentScoreTime.value;
        const scoreTimeFrameEnd = currentScoreTime.value += webAudioTimeToMusicalTime(deltaTime);

        let catchUp = isFirtClockAfterPlay;
        isFirtClockAfterPlay = false;

        let playNotes: Note[] = [];

        let loopEndReached = (loopNow && scoreTimeFrameEnd >= loopNow.timeEnd) ? loopNow : false;

        let playRangeEnd = currentScoreTime.value;
        if (loopEndReached) playRangeEnd = loopEndReached.timeEnd;
        playNotes = getNotesBetween(scoreTimeFrameStart, playRangeEnd, catchUp);

        if (loopEndReached) {
            console.log('restart loop');
            // in order to keep time precise, start new loop with 'remainder' start offset
            const remainder = scoreTimeFrameEnd - loopEndReached.timeEnd;
            if (loopToJumpTo.value) {
                // find notes between that loop start and remainder to play
                jumpToJumpLoop(remainder, playNotes);
            } else if (loopEndReached.repetitionsLeft) {
                const loopStartNotes = getNotesBetween(loopEndReached.time, loopEndReached.time + remainder)
                // .map(inote => {
                //     const noteClone = note(inote);
                //     transposeTime(noteClone, transposeNoteTime);
                //     return noteClone;
                // })
                playNotes.push(...loopStartNotes);

                currentScoreTime.value = loopEndReached.time + remainder;
                loopEndReached.repetitionsLeft--;
                if (loopNowHierarchical) loops.resetChildrenLoopRepetitions(loopNowHierarchical);
            }
        }

        if (catchUp || loopEndReached) {
            catchUpAutomations(scoreTimeFrameStart);
        }

        playNotes.forEach((editNote) => {
            if (editNote.mute) return;
            let noteStartRelative = musicalTimeToWebAudioTime(editNote.time - scoreTimeFrameStart);
            if (noteStartRelative < 0) {
                devWarn("playback look-ahead is not long enough for precise timing");
                noteStartRelative = 0;
            }
            const eventStartAbsolute = tickTime + noteStartRelative;
            let noteDuration = 0;
            if (editNote.type === TraceType.Note) {
                noteDuration = musicalTimeToWebAudioTime(getDuration(editNote));
            }

            try {
                synth.scheduleNote(editNote, eventStartAbsolute, noteDuration);
            } catch (e) {
                console.error("could not schedule event", editNote, e);
            }
        });

        const automationsInTime = automation.getAutomationsForTime(scoreTimeFrameStart, scoreTimeFrameEnd, catchUp);
        for (let [lane, contents] of automationsInTime) {
            const param = lane.targetParameter;
            if (!param) continue;
            for (let point of contents) {
                const mappedValue = automationRangeToParamRange(point.value, {
                    min: param.min, max: param.max
                });
                let animationEndAbsolute = tickTime + musicalTimeToWebAudioTime(point.time - scoreTimeFrameStart);
                // only if my new point happens later than the last scheduled
                if ((param.currentTween?.timeEnd || 0) < animationEndAbsolute) {
                    addAutomationDestinationPoint(param, animationEndAbsolute, mappedValue);
                }
            }
        }

        previousClockTime = tickTime;

        if (currentTimeout.value) clearTimeout(currentTimeout.value);
        currentTimeout.value = setTimeout(_clockAction, playFrameSizeMs);

    }
    /**
     * in order to indicate upon playback, whether its paused or stopped
     */
    let isPaused = false;

    const resetLoopRepetitions = () => {
        loops.resetLoopRepetitions();
    }

    const play = async () => {
        if (!isPaused) resetLoopRepetitions();
        const audioContext = audioContextStore.audioContext;

        if (audioContext.state !== 'running') await audioContext.resume();
        console.log("play");
        playing.value = true;
        if (currentTimeout.value) throw new Error("timeout already exists");

        previousClockTime = audioContext.currentTime;
        isFirtClockAfterPlay = true;
        currentTimeout.value = setTimeout(_clockAction, 0);

    }

    const stop = () => {
        clearTimeout(currentTimeout.value);
        currentTimeout.value = null;
        playing.value = false;
        currentScoreTime.value = timeReturnPoint.value;
        previousClockTime = 0;
        synth.releaseAll();
        resetLoopRepetitions();
        automation.lanes.forEach((lane) => {
            const automatable = lane.targetParameter && isAutomatable(lane.targetParameter);
            if (!automatable) return;
            stopAndResetAnimations(automatable);
        });
        isPaused = false;
    }

    const pause = () => {
        clearTimeout(currentTimeout.value);
        currentTimeout.value = null;
        isPaused = true;
        playing.value = false;
    }


    watchEffect(() => {
        if (!view.timeToPxWithOffset) return;
        playbarPxPosition.value = view.timeToPxWithOffset(currentScoreTime.value);
    });

    // i.e. when user skips in timeline
    watch(timeReturnPoint, () => {
        isFirtClockAfterPlay = true;
        // synth.value?.releaseAll();
    })

    return {
        playing,
        bpm,
        currentScoreTime,
        timeReturnPoint,
        currentTimeout,
        playbarPxPosition,
        paused,
        stopped,
        play,
        stop,
        pause,
        enqueueLoop,
        loopToJumpTo,
        resetLoopRepetitions,
        catchUpAutomations,
        midiInputs, currentMidiInput,
        midiConectionModes, currentMidiConnectionMode,
        testBeep: async () => {
            !isTauri() && console.warn("beep only works in tauri");
            const { invoke } = await tauriObject();
            await invoke("trigger", {
                frequency: 80 + 440 * Math.pow(2, Math.random()),
                amplitude: 1,
            });
            console.log("beeped");
        }

    }
});