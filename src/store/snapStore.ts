import Fraction from 'fraction.js';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { TimeRange } from '../dataTypes/TimelineItem';
import { getNotesInRange } from '../functions/getNotesInRange';
import { frequencyToOctave, octaveToFrequency } from '../functions/toneConverters';
import colundi from '../scales/colundi';
import { useViewStore } from './viewStore';
const fundamental = octaveToFrequency(0);
console.log("fundamental", fundamental);

export type SnapExplanation<T = EditNote> = {
    text: string;
    relatedNote?: EditNote;
    relatedNumber?: number;
};

class SnapTracker<T = EditNote>{
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
    snapValueToObjectMap = new Map<number, SnapExplanation<T>[]>();

    /** instert a new snapped value to contend as teh closest snap point */
    addSnappedValue(snappedValue: number, relatedSnapObject?: SnapExplanation<T>) {
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
    timeQuarter: {
        description: "Times which are multiples of 1/4 of a time unit.",
        icon: "1/4\u00d7",
        type: SnapType.Time,
        active: false,
    },
    sameStart: {
        description: "Start positions equal to the start positions of other notes.",
        icon: "=",
        type: SnapType.Time,
        active: false,
    },
    timeIntegerRelationFraction: {
        description: "The time of the note is a simple fraction of the time of another note.",
        icon: "T a/b",
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
    const simplify = ref<number>(0.12);
    const values = ref(snaps);
    const focusedNote = ref(null as EditNote | null);
    const timeSnapExplanation = ref([] as SnapExplanation[]);
    const toneSnapExplanation = ref([] as SnapExplanation[]);
    const customOctavesTable = ref(colundi as number[]);
    const onlyWithMutednotes = ref(false);
    const onlyWithSimultaneousNotes = ref(false);
    const onlyWithNotesInView = ref(false);

    const acceptable = (candidateOctave: number) => {
        return candidateOctave !== Infinity && candidateOctave !== -Infinity && !isNaN(candidateOctave);
    }

    /** sets a simple focusedNote flag for display purposes */
    const setFocusedNote = (to: EditNote) => {
        resetSnapExplanation();
        focusedNote.value = to;
    };
    const resetSnapExplanation = () => {
        timeSnapExplanation.value = [];
        toneSnapExplanation.value = [];
    };
    interface OctaveSnapParams {
        targetOctave: number,
        otherNotes: EditNote[] | undefined,
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

    const filterSnapNotes = (otherNotes: EditNote[] | undefined) => {
        if (otherNotes === undefined) return;
        let returnValue = otherNotes
        if (onlyWithMutednotes.value) {
            returnValue = otherNotes.filter((editNote) => editNote.mute);
        }
        if (onlyWithNotesInView.value) {
            returnValue = otherNotes.filter((editNote) => view.isNoteInView(editNote))
        }
        if (onlyWithSimultaneousNotes.value && focusedNote.value) {
            returnValue = getNotesInRange(returnValue, {
                time: focusedNote.value.time,
                timeEnd: focusedNote.value.timeEnd,
            });
        }
        return returnValue;
    }


    const octaveSnaps = ({
        targetOctave,
        otherNotes,
        targetHz,
        snapValues,
    }: OctaveSnapParams) => {
        otherNotes = filterSnapNotes(otherNotes);
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
        if (otherNotes) {
            if (snapValues.arbitraryGridEDO.active === true) {
                const gcd = (a: number, b: number): number => {
                    if (b === 0) return a;
                    return gcd(b, a % b);
                }

                const lowestTwoNotes = otherNotes.sort((a, b) => a.octave - b.octave).slice(0, 2);
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

                const lowestTwoNotes = otherNotes.sort((a, b) => a.frequency - b.frequency).slice(0, 2);
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
                for (const otherNote of otherNotes) {
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
                    for (const otherNote of otherNotes) {
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
                    for (const otherNote of otherNotes) {
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
                    for (const otherNote of otherNotes) {
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
                    for (const otherNote of otherNotes) {
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
                    for (const otherNote of otherNotes) {
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
        otherNotes: EditNote[] | undefined,
        subject: TimeRange | EditNote,
        durationSnap: SnapTracker<TimeRange | EditNote> | false,
        snapValues: { [key: string]: SnapDefinition },
    }

    const timeSnaps = <T = EditNote>({
        otherNotes,
        subject,
        durationSnap,
        snapValues,
    }: TimeSnapParams) => {
        otherNotes = filterSnapNotes(otherNotes);
        const timeSnap = new SnapTracker<T>(subject.time);
        if (snapValues.arbitraryTimeGrid.active === true) {
            if (otherNotes) {
                const earliestTwoNotes = otherNotes.sort((a, b) => a.time - b.time).slice(0, 2);
                if (earliestTwoNotes.length === 2) {
                    const earliestNote = earliestTwoNotes[0];
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

        if (snapValues.timeQuarter.active === true) {
            const relatedNumber = Math.round(subject.time * 4);
            timeSnap.addSnappedValue(relatedNumber / 4, {
                text: "Quarter snap",
                relatedNumber,
            });
            if (durationSnap && 'duration' in subject) {
                const relatedNumberd = Math.round(subject.duration! * 4) / 4
                durationSnap.addSnappedValue(relatedNumberd, {
                    text: "Quarter snap",
                    relatedNumber: relatedNumberd,
                });
            }
        } else if (snapValues.timeInteger.active === true) {
            const relatedStart = Math.round(subject.time);
            timeSnap.addSnappedValue(relatedStart, {
                text: "Integer snap",
                relatedNumber: relatedStart,
            });
            if (durationSnap && 'duration' in subject) {
                const relatedDuration = Math.round(subject.duration!);
                durationSnap.addSnappedValue(relatedDuration, {
                    text: "Integer snap",
                    relatedNumber: relatedDuration,
                });
            }
        }

        if (snapValues.sameStart.active === true) {
            if (otherNotes) {
                for (const otherNote of otherNotes) {
                    timeSnap.addSnappedValue(otherNote.time, {
                        text: "Same start",
                        relatedNote: otherNote,
                    });
                }
            }
        }

        if (snapValues.timeIntegerRelationFraction.active === true) {
            if (otherNotes) {
                for (const otherNote of otherNotes) {
                    const otherStart = otherNote.time;
                    const closestStartFraction = new Fraction(subject.time).div(otherStart).simplify(simplify.value);
                    const closeStartRatio = closestStartFraction.valueOf();
                    // reintegrate rounded proportion back to the other's start value
                    const myCandidateStart = closeStartRatio * otherStart;
                    timeSnap.addSnappedValue(myCandidateStart, {
                        text: `time fraction ${closestStartFraction.toString()}`,
                        relatedNote: otherNote,
                    });
                }
            }
        }
        return { timeSnap };
    }

    /** has side effects to snap explanations */
    interface SnapParams {
        inNote: EditNote,
        targetOctave: number,
        otherNotes?: Array<EditNote>,
        sideEffects?: boolean,
        skipOctaveSnap?: boolean,
        skipTimeSnap?: boolean,
    }
    const snap = ({
        inNote,
        targetOctave,
        otherNotes,
        sideEffects = true,
        skipOctaveSnap = false,
        skipTimeSnap = false,
    }: SnapParams) => {
        otherNotes = filterSnapNotes(otherNotes);
        /** outNote */
        const output = inNote.clone();
        const targetHz = octaveToFrequency(targetOctave);

        const durationSnap = output.duration ? new SnapTracker(output.duration) : false;

        const snapValues = values.value as { [key: string]: SnapDefinition };

        // Time snaps
        if (!skipTimeSnap) {

            const { timeSnap } = timeSnaps({
                otherNotes,
                subject: output,
                durationSnap,
                snapValues
            });
            output.time = timeSnap.getResult();
            if (sideEffects) {
                timeSnapExplanation.value.push(...timeSnap.getSnapObjectsOfSnappedValue());
            }
        }
        // Tone snaps
        if (!skipOctaveSnap) {
            const { toneSnap } = octaveSnaps({
                otherNotes,
                targetOctave,
                targetHz,
                snapValues
            });
            output.octave = toneSnap.getResult();
            if (sideEffects) {
                toneSnapExplanation.value.push(...toneSnap.getSnapObjectsOfSnappedValue());
            }
        }


        if (durationSnap) output.duration = durationSnap.getResult();



        return output;

    }




    /** has side effects to snap explanations */
    interface TimeRangeSnapParams<T extends TimeRange> {
        inTimeRange: T,
        otherNotes?: Array<EditNote>,
        sideEffects?: boolean,
    }
    const snapTimeRange = <T extends TimeRange>({
        inTimeRange,
        otherNotes,
        sideEffects = true,
    }: TimeRangeSnapParams<T>): T & { duration: number } => {
        otherNotes = filterSnapNotes(otherNotes);

        const output: T & { duration: number } = {
            ...inTimeRange,
            time: inTimeRange.time,
            timeEnd: inTimeRange.timeEnd,
            duration: inTimeRange.timeEnd - inTimeRange.time,
        }

        const durationSnap = output.duration ? new SnapTracker<TimeRange>(output.duration) : false;
        const snapValues = values.value as { [key: string]: SnapDefinition };

        const { timeSnap } = timeSnaps({
            otherNotes,
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

    return {
        simplify,
        values,
        focusedNote,
        timeSnapExplanation,
        toneSnapExplanation,
        customOctavesTable,
        onlyWithMutednotes,
        onlyWithSimultaneousNotes,
        onlyWithNotesInView,
        setFocusedNote,
        resetSnapExplanation,
        snap,
        snapTimeRange,

    }

});