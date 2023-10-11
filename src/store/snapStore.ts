import Fraction from 'fraction.js';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Note } from '../dataTypes/Note';
import { TimeRange } from '../dataTypes/TimelineItem';
import { Trace, TraceType, cloneTrace } from '../dataTypes/Trace';
import { getTracesInRange } from '../functions/getEventsInRange';
import { frequencyToOctave, octaveToFrequency } from '../functions/toneConverters';
import colundi from '../scales/colundi';
import { useViewStore } from './viewStore';
import { Loop } from '../dataTypes/Loop';
import { useLayerStore } from './layerStore';
import { useToolStore } from './toolStore';
import { filterMap } from '../functions/filterMap';
const fundamental = octaveToFrequency(0);
console.log("fundamental", fundamental);



export type SnapExplanationAbs = {
    text: string;
};


export type SnapExplanationRelative = {
    text: string;
    relatedNote: Trace;
    relatedNumber: number;
};

export type SnapExplanation = SnapExplanationAbs | SnapExplanationRelative;

class SnapTracker {
    /** the smallest distance to a snap value found thus far */
    closestSnappedDistance: number | null = null;
    /** the resulting value corresponding to the closest snap */
    closestSnappedValue: number | null = null;
    /** the target value, if no snap were to be applied */
    rawValue: number;
    /** 
     * keeps track of relations between relatedSnapObjects and a value, so that 
     * when a snap succeeds, it can also provide all the other objects that provide
     * the same snap
     */
    snapValueToObjectMap = new Map<number, SnapExplanation[]>();

    /** instert a new snapped value to contend as teh closest snap point */
    addSnappedValue(snappedValue: number, relatedSnapObject?: SnapExplanation) {
        if (this.rawValue === null) {
            throw new Error("rawValue is null");
        }
        const snapDistance = Math.abs(snappedValue - this.rawValue);
        if (this.closestSnappedDistance === null || snapDistance < this.closestSnappedDistance) {
            this.closestSnappedValue = snappedValue;
            this.closestSnappedDistance = snapDistance;
        }
        if (relatedSnapObject !== undefined) {
            const existing = this.snapValueToObjectMap.get(snappedValue);
            if (existing === undefined) {
                this.snapValueToObjectMap.set(snappedValue, [relatedSnapObject]);
            } else {
                existing.push(relatedSnapObject);
            }
        }
    }

    getSnapObjectsOfSnappedValue() {
        if (this.closestSnappedValue === null) {
            return [];
        }
        const ret = this.snapValueToObjectMap.get(this.closestSnappedValue);
        if (ret === undefined) {
            return [];
        }
        return ret;
    }

    getResult(): number {
        if (this.closestSnappedValue === null) {
            return this.rawValue;
        }
        return this.closestSnappedValue;
    }

    constructor(rawValue: number) {
        this.rawValue = rawValue;
    }
}

export enum SnapType {
    Time,
    Tone,
    ToneRelation,
    ToneRelationMulti,
}

interface SnapDefinition {
    description: string,
    icon: string,
    type: SnapType,
    active: boolean,
}
/*


        if (snapValues.equal1.active === true) {
            toneSnap.addSnappedValue(Math.round(targetOctave));
        }
        if (snapValues.equal10.active === true) {
            EDOSsnap(10, targetOctave, toneSnap);
        }
        if (snapValues.equal12.active === true) {
            EDOSsnap(12, targetOctave, toneSnap);
        }
        if (snapValues.equal19.active === true) {
            EDOSsnap(19, targetOctave, toneSnap);
        }
        if (snapValues.equal22.active === true) {
            EDOSsnap(22, targetOctave, toneSnap);
        }
        if (snapValues.equal24.active === true) {
            EDOSsnap(24, targetOctave, toneSnap);
        }
        if (snapValues.equal31.active === true) {
            EDOSsnap(31, targetOctave, toneSnap);
        }
        
*/
const snaps: { [key: string]: SnapDefinition } = {
    customFrequencyTable: {
        description: "Snap to custom frequency table",
        icon: "Custom",
        type: SnapType.Tone,
        active: false,
    },
    equal1: {
        description: "Octaves only",
        icon: "1EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal7: {
        description: "Equal temperament, 7 tones",
        icon: "7EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal10: {
        description: "Equal temperament, 10 tones",
        icon: "10EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal12: {
        description: "Equal temperament, 12 tones",
        icon: "12EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal19: {
        description: "Equal temperament, 19 tones",
        icon: "19EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal22: {
        description: "Equal temperament, 22 tones",
        icon: "22EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal24: {
        description: "Equal temperament, 24 tones",
        icon: "24EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal31: {
        description: "Equal temperament, 31 tones",
        icon: "31EDO",
        type: SnapType.Tone,
        active: false,
    },
    equal48: {
        description: "Equal temperament, 48 tones",
        icon: "48EDO",
        type: SnapType.Tone,
        active: false,
    },
    hzFundamentalMultiple: {
        description: "frequencies which are multiple of the fundamental frequency (" + fundamental + ")",
        icon: "FF\u00d7",
        type: SnapType.Tone,
        active: false,
    },
    hzMult: {
        description: "frequencies which are multiple of one another",
        icon: "a\u00d7b",
        type: SnapType.ToneRelation,
        active: false,
    },
    hzRelationFraction: {
        description: "The frequency of the note is a simple fraction of the frequency of another note.",
        icon: "a/b",
        type: SnapType.ToneRelation,
        active: false,
    },
    hzHalfOrDouble: {
        description: "The frequency of the note is a half or double the other",
        icon: "2x",
        type: SnapType.ToneRelation,
        active: false,
    },
    hzThird: {
        description: "The frequency of the note is a third or three times the other",
        icon: "3x",
        type: SnapType.ToneRelation,
        active: false,
    },
    hzFifth: {
        description: "The frequency of the note is a fifth or five times the other",
        icon: "5x",
        type: SnapType.ToneRelation,
        active: false,
    },
    hzSeventh: {
        description: "The frequency of the note is a seventh or seven times the other",
        icon: "7x",
        type: SnapType.ToneRelation,
        active: false,
    },
    arbitraryGridEDO: {
        description: "Create an EDO grid that extrapolates the lowest two notes in range",
        icon: "⋮ EDO",
        type: SnapType.ToneRelationMulti,
        active: false,
    },
    arbitraryGridHZ: {
        description: "Create a frequency grid that extrapolates the lowest two notes in range",
        icon: "⋮ HZ",
        type: SnapType.ToneRelationMulti,
        active: false,
    },
    timeInteger: {
        description: "Times that are multiple of 1 time unit",
        icon: "1\u00d7",
        type: SnapType.Time,
        active: false,
    },
    timeFraction: {
        description: "Times which are simple fractions of 1 time unit",
        icon: "T + 1/b",
        type: SnapType.Time,
        active: false,
    },
    sameStart: {
        description: "Start positions equal to the start positions of other notes.",
        icon: "=",
        type: SnapType.Time,
        active: false,
    },
    arbitraryTimeGrid: {
        description: "Create a time grid that extrapolates the first two notes",
        icon: "⋯ T",
        type: SnapType.Time,
        active: false,
    }
};

// TODO: bug when resizing; it snaps tone. Why is it even spending 
// time on tone snapping when resizing!?
export const useSnapStore = defineStore("snap", () => {
    const view = useViewStore();
    const tool = useToolStore();
    const layers = useLayerStore();
    const simplify = ref<number>(0.12);
    const values = ref(snaps);
    const focusedTrace = ref(null as Trace | null);
    
    const timeSnapExplanation = ref([] as SnapExplanation[]);
    const toneSnapExplanation = ref([] as SnapExplanation[]);

    const customOctavesTable = ref(colundi as number[]);
    const onlyWithMutednotes = ref(false);
    const onlyWithSimultaneousNotes = ref(false);
    const onlyWithNotesInView = ref(false);
    const onlyWithNotesInTheSameLayer = ref(false);
    const onlyWithNotesInDifferentLayer = ref(false);


    const acceptable = (candidateOctave: number) => {
        return candidateOctave !== Infinity && candidateOctave !== -Infinity && !isNaN(candidateOctave);
    }

    const resetSnapExplanation = () => {
        timeSnapExplanation.value = [];
        toneSnapExplanation.value = [];
    };
    interface OctaveSnapParams {
        targetOctave: number,
        otherTraces: Trace[] | undefined,
        targetHz: number,
        snapValues: { [key: string]: SnapDefinition },
    }

    const EDOSsnap = (edo: number, targetOctave: number, toneSnap: SnapTracker) => {
        const relatedNumber = Math.round(targetOctave * edo) / edo;
        toneSnap.addSnappedValue(relatedNumber, {
            text: "EDO " + edo,
            relatedNumber,
        });
    }

    const filterSnapTraces = (list: Trace[]): (Trace[]) | undefined => {
        if (list === undefined) return;
        let returnValue = list

        // remove traces in groups which aren't visible
        returnValue = returnValue.filter((trace) => {
            if ('layer' in trace) {
                const layer = layers.layers[trace.layer];
                return layer.visible;
            }
            return true;
        });


        if (onlyWithMutednotes.value) {
            returnValue = returnValue.filter((trace) => (trace.type === TraceType.Note && trace.mute));
        }
        if (onlyWithNotesInView.value) {
            returnValue = getTracesInRange(returnValue, {
                time: view.timeOffset,
                timeEnd: view.timeOffset + view.viewWidthTime,
                octave: -view.octaveOffset,
                octaveEnd: -view.octaveOffset + view.viewHeightOctaves,
            });
        }
        if (onlyWithSimultaneousNotes.value && focusedTrace.value) {
            returnValue = getTracesInRange(returnValue, {
                time: focusedTrace.value.time,
                timeEnd: focusedTrace.value.timeEnd,
            });
        }
        if (onlyWithNotesInDifferentLayer.value && onlyWithNotesInTheSameLayer.value) {
            throw new Error("both onlyWithNotesInDifferentLayer and onlyWithNotesInTheSameLayer are true");
        }
        if (onlyWithNotesInTheSameLayer.value) {
            const activeLayer = tool.currentLayerNumber;
            returnValue = returnValue.filter((trace) => {
                return ('layer' in trace && trace.layer === activeLayer)
            });
            return returnValue;
        } else if (onlyWithNotesInDifferentLayer.value) {
            const activeLayer = tool.currentLayerNumber;
            returnValue = returnValue.filter((trace) => {
                return ('layer' in trace && trace.layer !== activeLayer)
            });
            return returnValue;
        }
        return returnValue;
    }


    const octaveSnaps = ({
        targetOctave,
        otherTraces,
        targetHz,
        snapValues,
    }: OctaveSnapParams) => {
        otherTraces = otherTraces ? filterSnapTraces(otherTraces) : undefined;

        const toneSnap = new SnapTracker(targetOctave);

        if (snapValues.customFrequencyTable.active === true) {
            if (customOctavesTable.value.length > 0) {
                // find the closest frequency in the table
                const closestOctave = customOctavesTable.value.reduce((prev, curr) => {
                    return (Math.abs(curr - targetOctave) < Math.abs(prev - targetOctave) ? curr : prev);
                });
                toneSnap.addSnappedValue(closestOctave, {
                    text: "custom frequency table",
                    relatedNumber: closestOctave,
                });
            }
        }

        if (snapValues.hzFundamentalMultiple.active === true) {
            const relatedNumber = fundamental;
            const frequencyValue = Math.round(targetHz / fundamental) * fundamental;
            toneSnap.addSnappedValue(frequencyToOctave(frequencyValue), {
                text: "hzFundamentalMultiple",
                relatedNumber,
            });
        }
        if (snapValues.equal1.active === true) {
            toneSnap.addSnappedValue(Math.round(targetOctave));
        }
        if (snapValues.equal7.active === true) {
            EDOSsnap(7, targetOctave, toneSnap);
        }
        if (snapValues.equal10.active === true) {
            EDOSsnap(10, targetOctave, toneSnap);
        }
        if (snapValues.equal12.active === true) {
            EDOSsnap(12, targetOctave, toneSnap);
        }
        if (snapValues.equal19.active === true) {
            EDOSsnap(19, targetOctave, toneSnap);
        }
        if (snapValues.equal22.active === true) {
            EDOSsnap(22, targetOctave, toneSnap);
        }
        if (snapValues.equal24.active === true) {
            EDOSsnap(24, targetOctave, toneSnap);
        }
        if (snapValues.equal31.active === true) {
            EDOSsnap(31, targetOctave, toneSnap);
        }
        if (snapValues.equal48.active === true) {
            EDOSsnap(48, targetOctave, toneSnap);
        }


        /** 
         * target / other = other * 1 / target
         * mycandidate = other
        **/
        if (otherTraces) {
            type TonalTrace = Note & { frequency: number };
            const tonalTraces: (TonalTrace)[] =
                (otherTraces.filter(t => t.type === TraceType.Note) as Note[])
                    .map((note) => {
                        // TODO: calculate only upon need, memoization
                        const frequency = octaveToFrequency(note.octave);
                        return {
                            ...note,
                            frequency,
                        }
                    }) as TonalTrace[];

            if (snapValues.arbitraryGridEDO.active === true) {
                const gcd = (a: number, b: number): number => {
                    if (b === 0) return a;
                    return gcd(b, a % b);
                }

                const lowestTwoNotes = tonalTraces.sort((a, b) => a.octave - b.octave).slice(0, 2);
                if (lowestTwoNotes.length === 2) {
                    const lowestNote = lowestTwoNotes[0];
                    const datumOctave = lowestNote.octave;
                    const octaveInterval = lowestTwoNotes[1].octave - lowestTwoNotes[0].octave;
                    const offsetTargetOctave = targetOctave - datumOctave;
                    const candidateOctave = datumOctave + octaveInterval * Math.round(offsetTargetOctave / octaveInterval);

                    if (acceptable(candidateOctave)) {

                        toneSnap.addSnappedValue(candidateOctave, {
                            text: "lowest notes grid",
                            relatedNumber: candidateOctave,
                            relatedNote: lowestNote,
                        });

                        toneSnap.addSnappedValue(candidateOctave, {
                            text: "",
                            relatedNumber: candidateOctave,
                            relatedNote: lowestTwoNotes[1],
                        });
                    }

                }
            }

            if (snapValues.arbitraryGridHZ.active === true) {
                const gcd = (a: number, b: number): number => {
                    if (b === 0) return a;
                    return gcd(b, a % b);
                }

                const lowestTwoNotes = tonalTraces.sort((a, b) => a.frequency - b.frequency).slice(0, 2);
                if (lowestTwoNotes.length === 2) {
                    const lowestNote = lowestTwoNotes[0];
                    const datumFreq = lowestNote.frequency;
                    const frequencyInterval = lowestTwoNotes[1].frequency - lowestTwoNotes[0].frequency;
                    const offsetTargetFreq = targetHz - datumFreq;
                    const candidateFreq = datumFreq + frequencyInterval * Math.round(offsetTargetFreq / frequencyInterval);
                    const candidateOctave = frequencyToOctave(candidateFreq);

                    if (acceptable(candidateOctave)) {

                        toneSnap.addSnappedValue(candidateOctave, {
                            text: "lowest notes grid",
                            relatedNumber: candidateOctave,
                            relatedNote: lowestNote,
                        });

                        toneSnap.addSnappedValue(candidateOctave, {
                            text: "",
                            relatedNumber: candidateOctave,
                            relatedNote: lowestTwoNotes[1],
                        });
                    }

                }
            }


            if (snapValues.hzRelationFraction.active === true) {
                for (const otherNote of tonalTraces) {
                    const otherHz = otherNote.frequency;
                    const fraction = new Fraction(targetHz).div(otherHz).simplify(simplify.value);
                    const closeHzRatio = fraction.valueOf();
                    // reintegrate rounded proportion back to the other's hz value
                    const myCandidateHz = closeHzRatio * otherHz;
                    const myCandidateOctave = frequencyToOctave(myCandidateHz);
                    toneSnap.addSnappedValue(myCandidateOctave, {
                        text: `hz fraction ${fraction.toFraction(true)}`,
                        relatedNote: otherNote,
                    });
                }
            } else {
                // It is presumed that fraction includes all these possibilites

                if (snapValues.hzMult.active === true) {
                    for (const otherNote of tonalTraces) {
                        const relatedNumber = Math.round(targetHz / otherNote.frequency) * otherNote.frequency;
                        let txt = "multiple of ";
                        if (relatedNumber === otherNote.frequency) txt = "equal to ";
                        toneSnap.addSnappedValue(frequencyToOctave(relatedNumber), {
                            text: txt + otherNote.frequency.toPrecision(3),
                            relatedNumber,
                            relatedNote: otherNote,
                        });
                    }
                };

                if (snapValues.hzHalfOrDouble.active === true) {
                    for (const otherNote of tonalTraces) {
                        const myCandidateHzDouble = otherNote.frequency * 2
                        const myCandidateOctaveDouble = frequencyToOctave(myCandidateHzDouble);
                        const myCandidateHzHalf = otherNote.frequency / 2
                        const myCandidateOctaveHalf = frequencyToOctave(myCandidateHzHalf);
                        const myCandidateEqual = otherNote.frequency;
                        const myCandidateEqualOctave = frequencyToOctave(myCandidateEqual);

                        toneSnap.addSnappedValue(myCandidateOctaveDouble, {
                            text: `double the frequency`,
                            relatedNote: otherNote,
                        });
                        toneSnap.addSnappedValue(myCandidateOctaveHalf, {
                            text: `half the frequency`,
                            relatedNote: otherNote,
                        });
                        toneSnap.addSnappedValue(myCandidateEqualOctave, {
                            text: `same tone`,
                            relatedNote: otherNote,
                        });
                    }
                }
                if (snapValues.hzThird.active === true) {
                    for (const otherNote of tonalTraces) {
                        const myCandidateHzDouble = otherNote.frequency * 3
                        const myCandidateOctaveDouble = frequencyToOctave(myCandidateHzDouble);
                        const myCandidateHzHalf = otherNote.frequency / 3
                        const myCandidateOctaveHalf = frequencyToOctave(myCandidateHzHalf);

                        toneSnap.addSnappedValue(myCandidateOctaveDouble, {
                            text: `3x the frequency`,
                            relatedNote: otherNote,
                        });
                        toneSnap.addSnappedValue(myCandidateOctaveHalf, {
                            text: `1/3 the frequency`,
                            relatedNote: otherNote,
                        });
                    }
                }
                if (snapValues.hzFifth.active === true) {
                    for (const otherNote of tonalTraces) {
                        const myCandidateHzDouble = otherNote.frequency * 5
                        const myCandidateOctaveDouble = frequencyToOctave(myCandidateHzDouble);
                        const myCandidateHzHalf = otherNote.frequency / 5
                        const myCandidateOctaveHalf = frequencyToOctave(myCandidateHzHalf);

                        toneSnap.addSnappedValue(myCandidateOctaveDouble, {
                            text: `5x the frequency`,
                            relatedNote: otherNote,
                        });
                        toneSnap.addSnappedValue(myCandidateOctaveHalf, {
                            text: `1/5 the frequency`,
                            relatedNote: otherNote,
                        });
                    }
                }
                if (snapValues.hzSeventh.active === true) {
                    for (const otherNote of tonalTraces) {
                        const myCandidateHzDouble = otherNote.frequency * 7
                        const myCandidateOctaveDouble = frequencyToOctave(myCandidateHzDouble);
                        const myCandidateHzHalf = otherNote.frequency / 7
                        const myCandidateOctaveHalf = frequencyToOctave(myCandidateHzHalf);

                        toneSnap.addSnappedValue(myCandidateOctaveDouble, {
                            text: `7x the frequency`,
                            relatedNote: otherNote,
                        });
                        toneSnap.addSnappedValue(myCandidateOctaveHalf, {
                            text: `1/7 the frequency`,
                            relatedNote: otherNote,
                        });
                    }
                }

            }
        }
        return { toneSnap };
    }

    interface TimeSnapParams {
        otherTraces: Trace[] | undefined,
        subject: TimeRange | Trace,
        durationSnap: SnapTracker | false,
        snapValues: { [key: string]: SnapDefinition },
    }

    const timeSnaps = <T = Trace>({
        otherTraces,
        subject,
        durationSnap,
        snapValues,
    }: TimeSnapParams) => {

        const timeSnap = new SnapTracker(subject.time);
        const subjectDuration = subject.timeEnd - subject.time;

        if (snapValues.arbitraryTimeGrid.active === true) {
            if (otherTraces) {
                const earliestTwoNotes = otherTraces.sort((a, b) => a.time - b.time).slice(0, 2);
                if (earliestTwoNotes.length === 2) {
                    const earliestNote: Trace | undefined = earliestTwoNotes[0];
                    const datumTime = earliestNote.time;
                    const timeInterval = earliestTwoNotes[1].time - earliestTwoNotes[0].time;
                    const offsetTargetTime = subject.time - datumTime;
                    const candidateTime = datumTime + timeInterval * Math.round(offsetTargetTime / timeInterval);

                    if (acceptable(candidateTime)) {

                        timeSnap.addSnappedValue(candidateTime, {
                            text: "first notes grid",
                            relatedNumber: candidateTime,
                            relatedNote: earliestNote,
                        });
                        timeSnap.addSnappedValue(candidateTime, {
                            text: "",
                            relatedNumber: candidateTime,
                            relatedNote: earliestTwoNotes[1],
                        });
                    }
                }
            }
        }

        if (snapValues.timeFraction.active === true) {
            const closestStartFraction = new Fraction(subject.time % 1).simplify(simplify.value);
            const closeStartRatio = closestStartFraction.valueOf();
            const myCandidateStart = Math.floor(subject.time) + closeStartRatio;
            timeSnap.addSnappedValue(myCandidateStart, {
                text: `time fraction ${ closestStartFraction.toFraction(true)}`,
                
            });
        } else if (snapValues.timeInteger.active === true) {
            const relatedStart = Math.round(subject.time);
            timeSnap.addSnappedValue(relatedStart, {
                text: "Integer snap",
                relatedNumber: relatedStart,
            });
            if (durationSnap) {
                const relatedDuration = Math.round(subjectDuration);
                durationSnap.addSnappedValue(relatedDuration, {
                    text: "Integer snap",
                    relatedNumber: relatedDuration,
                });
            }
        }

        if (snapValues.sameStart.active === true) {
            if (otherTraces) {
                for (const otherNote of otherTraces) {
                    timeSnap.addSnappedValue(otherNote.time, {
                        text: "Same start",
                        relatedNote: otherNote,
                    });
                }
            }
        }

        return { timeSnap };
    }

    /** has side effects to snap explanations */
    /** TODO: these params are insane */
    interface SnapParams<T extends Trace> {
        inNote: T,
        targetOctave?: number,
        otherTraces?: Array<Trace>,
        sideEffects?: boolean,
        skipOctaveSnap?: boolean,
        skipTimeSnap?: boolean,
        snapDuration?: boolean,
    }

    const snap = <T extends (Loop | Note)>({
        inNote,
        targetOctave,
        otherTraces,
        sideEffects = true,
        skipOctaveSnap = false,
        skipTimeSnap = false,
        snapDuration = false,
    }: SnapParams<T>): T => {
        otherTraces = otherTraces ? filterSnapTraces(otherTraces) : otherTraces;
        /** outNote */
        const output: T = cloneTrace(inNote);

        const subjectDuration = output.timeEnd - output.time;
        const durationSnap = snapDuration ? new SnapTracker(subjectDuration) : false;

        const snapValues = values.value as { [key: string]: SnapDefinition };

        // Time snaps
        if (!skipTimeSnap) {

            const { timeSnap } = timeSnaps({
                otherTraces,
                subject: output,
                durationSnap,
                snapValues
            });
            output.time = timeSnap.getResult();
            if (sideEffects) {
                timeSnapExplanation.value.push(...timeSnap.getSnapObjectsOfSnappedValue());
            }
        }
        if (targetOctave && output.type === TraceType.Note) {
            const targetHz = octaveToFrequency(targetOctave);
            // Tone snaps
            if (!skipOctaveSnap) {
                const { toneSnap } = octaveSnaps({
                    otherTraces,
                    targetOctave,
                    targetHz,
                    snapValues
                });
                output.octave = toneSnap.getResult();
                if (sideEffects) {
                    toneSnapExplanation.value.push(...toneSnap.getSnapObjectsOfSnappedValue());
                }
            }
        }

        if (snapDuration && durationSnap) {
            // when snapping duration, we want to prevent shifting the start
            // of the note, at least on all the current use cases
            output.time = inNote.time;
            output.timeEnd = output.time + durationSnap.getResult();
        }

        return output;
    }




    /** has side effects to snap explanations */
    interface TimeRangeSnapParams<T extends TimeRange> {
        inTimeRange: T,
        otherTraces?: Array<Trace>,
        sideEffects?: boolean,
    }
    const snapTimeRange = <T extends TimeRange>({
        inTimeRange,
        otherTraces,
        sideEffects = true,
    }: TimeRangeSnapParams<T>): T & { duration: number } => {
        otherTraces = otherTraces ? filterSnapTraces(otherTraces) : otherTraces;

        const output: T & { duration: number } = {
            ...inTimeRange,
            time: inTimeRange.time,
            timeEnd: inTimeRange.timeEnd,
            duration: inTimeRange.timeEnd - inTimeRange.time,
        }

        const durationSnap = output.duration ? new SnapTracker(output.duration) : false;
        const snapValues = values.value as { [key: string]: SnapDefinition };

        const { timeSnap } = timeSnaps({
            otherTraces,
            subject: output,
            durationSnap,
            snapValues
        });

        output.time = timeSnap.getResult();

        if (sideEffects) {
            timeSnapExplanation.value.push(...timeSnap.getSnapObjectsOfSnappedValue());
        }

        if (durationSnap) {
            output.duration = durationSnap.getResult();
        }

        return output;
    }


    const nonRelationalTimeSnapExplanation = ()=>{
        return filterMap(timeSnapExplanation.value,(snexp)=>{
            if(!('relatedNote' in snexp)){
                return snexp.text
            }
        }).join();
    };

    const nonRelationalToneSnapExplanation = ()=>{
        return filterMap(toneSnapExplanation.value,(snexp)=>{
            if(!('relatedNote' in snexp)){
                return snexp.text
            }
        }).join();
    };

    return {
        simplify,
        values,
        focusedTrace,
        timeSnapExplanation,
        toneSnapExplanation,
        customOctavesTable,
        onlyWithMutednotes,
        onlyWithSimultaneousNotes,
        onlyWithNotesInView,
        onlyWithNotesInTheSameLayer,
        onlyWithNotesInDifferentLayer,
        resetSnapExplanation,
        snap,
        snapTimeRange,
        nonRelationalTimeSnapExplanation,
        nonRelationalToneSnapExplanation,
    }

});