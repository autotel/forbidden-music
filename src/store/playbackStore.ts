
import { defineStore } from 'pinia';
import { computed, ref, watch, watchEffect } from 'vue';
import { Loop } from "../dataTypes/Loop";
import { Note, note } from "../dataTypes/Note";
import { getDuration } from "../dataTypes/TimelineItem";
import { TraceType, transposeTime } from "../dataTypes/Trace";
import isTauri, { tauriObject } from '../functions/isTauri';
import devMidiInputHandler from '../midiInputHandlers/log';
import octatrackMidiInputHandler from '../midiInputHandlers/octatrack';
import reaperMidiInputHandler from '../midiInputHandlers/reaper';
import { useAudioContextStore } from "./audioContextStore";
import { useProjectStore } from './projectStore';
import { useSynthStore } from './synthStore';
import { useViewStore } from './viewStore';
import { useAutomationLaneStore } from './automationLanesStore';
import { AutomationPoint, automationRangeToParamRange } from '../dataTypes/AutomationPoint';
import { filterMap } from '../functions/filterMap';
import { SynthParam } from '../synth/interfaces/SynthParam';
import { AutomatableSynthParam, addAutomationDestinationPoint, isAutomatable, stopAndResetAnimations } from '../synth/interfaces/Automatable';
import { probe } from '../functions/probe';


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
    const project = useProjectStore();
    const automation = useAutomationLaneStore();
    const audioContextStore = useAudioContextStore();
    const synth = useSynthStore();
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

    const sortedLoops = computed<Loop[]>(() => {
        return project.loops.sort((a, b) => a.timeEnd - b.timeEnd);
    });

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

    const setToNextLoop = () => {
        if (loopNow?.repetitionsLeft === 0) lastFinishedLoop = loopNow;
        let expectedLoopEnd = lastFinishedLoop?.timeEnd || currentScoreTime.value;
        loopNow = sortedLoops.value.find((loop) => {
            return (
                loop.timeEnd > expectedLoopEnd
            );
        });
        if (loopNow) loopNow.repetitionsLeft = loopNow.count - 1;
    }

    const resetLoopRepetitions = () => {
        lastFinishedLoop = undefined;
        setToNextLoop();
        project.loops.forEach((loop) => {
            if (loop === loopNow) return;
            delete loop.repetitionsLeft;
        });
    }

    const getNotesBetween = (frameStartTime: number, frameEndTime: number, catchUp = false) => {
        const events = project.notes.filter((editNote) => {
            return (catchUp ? editNote.timeEnd : editNote.time) >= frameStartTime && editNote.time < frameEndTime;
        });
        return events;
    };

    const catchUpAutomations = (scoreTime: number) => {
        const catchUpAutomations = new Map<AutomatableSynthParam, AutomationPoint>();
        probe(automation.getAutomationPointsAroundTime(scoreTime)
            , "ap's").forEach((automationItem) => {
                const { param, point } = automationItem;
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
            })
    }

    let isFirtClockAfterPlay = true;
    let loopNow: Loop | undefined;
    let lastFinishedLoop: Loop | undefined;
    const musicalTimeToWebAudioTime = (musicalTime: number) => {
        const rate = bpm.value / 60;
        return musicalTime / rate;
    }
    const webAudioTimeToMusicalTime = (webAudioTime: number) => {
        const rate = bpm.value / 60;
        return webAudioTime * rate;
    }

    const _clockAction = () => {
        const audioContext = audioContextStore.audioContext;
        if (!audioContext) throw new Error("audio context not created");

        if (!loopNow?.repetitionsLeft) {
            setToNextLoop();
        }

        // reference time to consider as zero towards each event to be queued
        const tickTime = audioContext.currentTime;
        const deltaTime = tickTime - previousClockTime;

        // notes time with respect to which we measure -t towards each event
        const scoreTimeFrameStart = currentScoreTime.value;
        const scoreTimeFrameEnd = currentScoreTime.value += webAudioTimeToMusicalTime(deltaTime);

        let catchUp = isFirtClockAfterPlay;
        isFirtClockAfterPlay = false;

        let playNotes: Note[] = [];

        let loopRestarted = (loopNow && scoreTimeFrameEnd >= loopNow.timeEnd) ? loopNow : false;

        let playRangeEnd = currentScoreTime.value;
        if (loopRestarted) playRangeEnd = loopRestarted.timeEnd;
        playNotes = getNotesBetween(scoreTimeFrameStart, playRangeEnd, catchUp);

        if (loopRestarted) {
            const remainder = scoreTimeFrameEnd - loopRestarted.timeEnd;
            const transposeNoteTime = getDuration(loopRestarted);
            const loopStartNotes = getNotesBetween(loopRestarted.time, loopRestarted.time + remainder)
                .map(inote => {
                    const noteClone = note(inote);
                    transposeTime(noteClone, transposeNoteTime);
                    return noteClone;
                })
            playNotes.push(...loopStartNotes);
            currentScoreTime.value = loopRestarted.time + remainder;
            if (loopRestarted.repetitionsLeft) loopRestarted.repetitionsLeft--;
        }

        if (catchUp || loopRestarted) {
            catchUpAutomations(scoreTimeFrameStart);
        }

        playNotes.forEach((editNote) => {
            if (editNote.mute) return;
            let noteStartRelative = musicalTimeToWebAudioTime(editNote.time - scoreTimeFrameStart);
            if (noteStartRelative < 0) {
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
        automation.getAutomationsForTime(scoreTimeFrameStart, scoreTimeFrameEnd, catchUp)
            .forEach((automationItem) => {
                const { param, point } = automationItem;
                const mappedValue = automationRangeToParamRange(point.value, {
                    min: param.min, max: param.max
                })
                let animationEndAbsolute = tickTime + musicalTimeToWebAudioTime(point.time - scoreTimeFrameStart);
                // only if my new point happens later than the last scheduled
                if ((param.currentTween?.timeEnd || 0) < animationEndAbsolute) {
                    addAutomationDestinationPoint(param, animationEndAbsolute, mappedValue);
                }
            });
        // if catchup, get prev and following automations, get value between and apply value to 
        // corresponding params


        previousClockTime = tickTime;

        if (currentTimeout.value) clearTimeout(currentTimeout.value);
        currentTimeout.value = setTimeout(_clockAction, playFrameSizeMs);

    }
    /**
     * in order to indicate upon playback, whether its paused or stopped
     */
    let isPaused = false;

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