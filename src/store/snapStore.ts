import { defineStore } from 'pinia'
import { frequencyToOctave, makeNote, Note, octaveToFrequency } from '../dataTypes/Note.js';
import { Tool } from '../dataTypes/Tool.js';
import Fraction from 'fraction.js';
import { EditNote } from '../dataTypes/EditNote.js';

const fundamental = octaveToFrequency(0);
console.log("fundamental", fundamental);

export type SnapExplanation = {
    text: string;
    relatedNote?: EditNote;
    relatedNumber?: number;
};

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

export const useSnapStore = defineStore("snap", {
    state: () => ({
        simplify: 0.1,
        snaps: {
            equal12: false,
            equal1: false,
            hzEven: false,
            hzMult88: false,
            hzMult44: false,
            hzRelationFraction: false,
            /** A rational number multiplier of the fundamental, linearly*/
            hzFundamentalMultiple: false,

            timeInteger: true,
            timeQuarter: false,
            sameStart: true,
            timeIntegerRelationFraction: false,

        },
        focusedNote: null as EditNote | null,
        timeSnapExplanation: [] as SnapExplanation[],
        toneSnapExplanation: [] as SnapExplanation[],
    }),

    actions: {
        setFocusedNote(to: EditNote) {
            this.resetSnapExplanation();
            this.focusedNote = to;
        },
        resetSnapExplanation() {
            this.timeSnapExplanation = [];
            this.toneSnapExplanation = [];
        },
        /** has side effects to snap explanations */
        snap(inNote: EditNote, targetOctave: number, otherNotes?: Array<EditNote>) {
            /** outNote */
            const editNote = inNote.clone();
            const targetHz = octaveToFrequency(targetOctave);

            const toneSnap = new SnapTracker(targetOctave);
            const timeSnap = new SnapTracker(editNote.note.start);
            const durationSnap = new SnapTracker(editNote.note.duration);

            // Time snaps

            if (this.snaps.timeQuarter === true) {
                const relatedNumber = Math.round(editNote.note.start * 4);
                timeSnap.addSnappedValue(relatedNumber / 4, {
                    text: "Quarter snap",
                    relatedNumber,
                });
                const relatedNumberd = Math.round(editNote.note.duration * 4) / 4
                durationSnap.addSnappedValue(relatedNumberd, {
                    text: "Quarter snap",
                    relatedNumber:relatedNumberd,
                });
            } else if (this.snaps.timeInteger === true) {
                const relatedStart = Math.round(editNote.note.start);
                const relatedDuration = Math.round(editNote.note.duration);
                timeSnap.addSnappedValue(relatedStart, {
                    text: "Integer snap",
                    relatedNumber: relatedStart,
                });
                durationSnap.addSnappedValue(relatedDuration, {
                    text: "Integer snap",
                    relatedNumber: relatedDuration,
                });
            }

            if (this.snaps.sameStart === true) {
                if (otherNotes) {
                    for (const otherNote of otherNotes) {
                        timeSnap.addSnappedValue(otherNote.note.start, {
                            text: "Same start",
                            relatedNote: otherNote,
                        });
                    }
                }
            }

            if (this.snaps.timeIntegerRelationFraction === true) {
                if (otherNotes) {
                    for (const otherNote of otherNotes) {
                        const otherStart = otherNote.note.start;
                        const closestStartFraction = new Fraction(editNote.note.start).div(otherStart).simplify(this.simplify);
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

            // Tone snaps
            if (this.snaps.hzEven === true) {
                const relatedNumber = Math.round(targetHz / 2) * 2;
                toneSnap.addSnappedValue(frequencyToOctave(relatedNumber), {
                    text: "hzEven",
                    relatedNumber,
                });
            };


            if (this.snaps.hzMult88 === true) {
                const relatedNumber = Math.round(targetHz / 88) * 88;
                toneSnap.addSnappedValue(frequencyToOctave(relatedNumber), {
                    text: "hzMult88",
                    relatedNumber,
                });
            };
            if (this.snaps.hzMult44 === true) {
                const relatedNumber = Math.round(targetHz / 44) * 44;
                toneSnap.addSnappedValue(
                    frequencyToOctave(relatedNumber), {
                    text: "hzMult44",
                    relatedNumber,
                });
            };
            /** 
             * target / other = other * 1 / target
             * mycandidate = other
             **/
            if (this.snaps.hzRelationFraction === true) {
                if (otherNotes) {
                    for (const otherNote of otherNotes) {
                        const otherHz = otherNote.note.frequency;
                        const fraction = new Fraction(targetHz).div(otherHz).simplify(this.simplify);
                        const closeHzRatio = fraction.valueOf();
                        // reintegrate rounded proportion back to the other's hz value
                        const myCandidateHz = closeHzRatio * otherHz;
                        const myCandidateOctave = frequencyToOctave(myCandidateHz);
                        toneSnap.addSnappedValue(myCandidateOctave, {
                            text: `hz fraction ${fraction.toString()}`,
                            relatedNote: otherNote,
                        });
                    }
                }
            }

            if (this.snaps.hzFundamentalMultiple === true) {
                const relatedNumber = fundamental;
                const frequencyValue = Math.round(targetHz / fundamental) * fundamental;
                toneSnap.addSnappedValue(frequencyToOctave(frequencyValue), {
                    text: "hzFundamentalMultiple",
                    relatedNumber,
                });
            }
            if (this.snaps.equal12 === true) {
                const relatedNumber = Math.round(targetOctave * 12) / 12;
                toneSnap.addSnappedValue(relatedNumber, {
                    text: "equal12",
                    relatedNumber,
                });
            } else if (this.snaps.equal1 === true) {
                // else because equal1 is subset of equal 12
                toneSnap.addSnappedValue(Math.round(targetOctave));
            }

            editNote.note.octave = toneSnap.getResult();
            editNote.note.start = timeSnap.getResult();
            editNote.note.duration = durationSnap.getResult();

            this.toneSnapExplanation.push(...toneSnap.getSnapObjectsOfSnappedValue());
            this.timeSnapExplanation.push(...timeSnap.getSnapObjectsOfSnappedValue());

            return {
                editNote,
            }
        }
    },

});