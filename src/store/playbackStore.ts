
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
import { SynthParam } from '../synth/SynthInterface';
import { filterMap } from '../functions/filterMap';


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
    /** 
     * Get the automation points corresponding to the given playback frame timerange
     */
    const getAutomationsForTime = (frameStartTime: number, frameEndTime: number, catchUp = false) => {
        /* 
          The return of this function is a bit counterintuitive:
          it returns the automation that follows whichever automation falls within the given range (fig 1.)
          and if catch-up is set to true, it also retuns the last automation before the range end
          
          This is because we want to animate towards the following automation, but we want to get only the 
          next automation on the first frame after the previous animation ended (fig 2) 
          so that we don't schedule destinations redundantly.
          
          fig 1:
          ----a--------a---------------a-------a--------
                       |               |       
                    in this moment     |
                                      return this one
                     
          
          fig 2:
          ----a--------a--------a-------a--------
                           |       
                     in this moment, return nothing (unless catch-up)
        */
        const returnValue: {
            param: SynthParam,
            point: AutomationPoint,
        }[] = [];

        automation.lanes.forEach((lane) => {
            const param = lane.targetParameter;
            if (!param) return;
            if (!lane.content.length) return;
            const selectedIndexes = filterMap(lane.content, (point, index) => {
                if (point.time >= frameStartTime && point.time < frameEndTime) {
                    return index + 1;
                }
                return false;
            })
            if (catchUp) {
                const prevPointIndex = selectedIndexes[0] - 1;
                if (prevPointIndex >= 0) {
                    selectedIndexes.unshift(prevPointIndex);
                }
            }

            returnValue.push(...filterMap(selectedIndexes, (index) => {
                const point = lane.content[index];
                if (!point) return false;
                return {
                    param,
                    point,
                }
            }))
        });
        return returnValue;
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

        getAutomationsForTime(scoreTimeFrameStart, scoreTimeFrameEnd, catchUp)
            .forEach((automation) => {
                const { param, point } = automation;
                const mappedValue = automationRangeToParamRange(point.value, {
                    min: param.min, max: param.max
                })
                let eventStartAbsolute = tickTime + musicalTimeToWebAudioTime(point.time - scoreTimeFrameStart);
                if (eventStartAbsolute < 0) {
                    // TODO: could lerp for more precision
                    eventStartAbsolute = 0;
                }
                try {
                    param.animate?.(mappedValue, eventStartAbsolute);
                } catch (e) {
                    console.error("could not schedule event", point, e);
                }
            });

        previousClockTime = tickTime;

        if (currentTimeout.value) clearTimeout(currentTimeout.value);
        currentTimeout.value = setTimeout(_clockAction, playFrameSizeMs);

    }
    /**
     * in order to indicate upon playback, whether its paused or stopped
     */
    let isPaused = false;

    const play = async () => {
        if(!isPaused) resetLoopRepetitions();
        const audioContext = audioContextStore.audioContext;
        if (audioContext.state !== 'running') await audioContext.resume();
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