import { defineStore } from 'pinia'
import { frequencyToOctave, makeNote, Note, octaveToFrequency } from '../dataTypes/Note.js';
import { Tool } from '../dataTypes/Tool.js';
import Fraction from 'fraction.js';
import { EditNote } from '../dataTypes/EditNote.js';

const fundamental = octaveToFrequency(0);
console.log("fundamental", fundamental);

class SnapTracker<T>{
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
    snapValueToObjectMap = new Map<number, T[]>();

    /** instert a new snapped value to contend as teh closest snap point */
    addSnappedValue(snappedValue: number, relatedSnapObject?: T) {
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

    getSnapObjectsOfSnappedValue(): T[] {
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

export const useToolStore = defineStore("tool", {
    state: () => ({
        current: Tool.Edit,
        simplify: 0.1,
        copyOnDrag: false,
        // TODO: when there is a snap, show a grid representing
        // the values to which it would snap, so that the user can target
        // visually
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
        }
    }),
    getters: {
    },
    actions: {
        getClosestFraction(value: number) {
            return new Fraction(value).simplify(this.simplify).valueOf();
        },
        snap(inNote: EditNote, targetOctave: number, otherNotes?: Array<EditNote>) {
            /** outNote */
            const editNote = inNote.clone();
            const targetHz = octaveToFrequency(targetOctave);
            const relatedNotes = [] as EditNote[];

            const toneSnap = new SnapTracker<EditNote>(targetOctave);
            const timeSnap = new SnapTracker<EditNote>(editNote.note.start);
            const durationSnap = new SnapTracker<EditNote>(editNote.note.duration);

            // Time snaps
            if (this.snaps.timeQuarter === true) {
                timeSnap.addSnappedValue(Math.round(editNote.note.start * 4) / 4);
                durationSnap.addSnappedValue(Math.round(editNote.note.duration * 4) / 4);
            } else if (this.snaps.timeInteger === true) {
                timeSnap.addSnappedValue(Math.round(editNote.note.start));
                durationSnap.addSnappedValue(Math.round(editNote.note.duration));
            }
            
            if (this.snaps.sameStart === true) {
                if (otherNotes) {
                    for (const otherNote of otherNotes) {
                        timeSnap.addSnappedValue(otherNote.note.start, otherNote);
                    }
                }
            }

            if(this.snaps.timeIntegerRelationFraction === true) {
                if (otherNotes) {
                    for (const otherNote of otherNotes) {
                        const otherStart = otherNote.note.start;
                        const closeStartRatio = new Fraction(editNote.note.start).div(otherStart).simplify(this.simplify).valueOf();
                        // reintegrate rounded proportion back to the other's start value
                        const myCandidateStart = closeStartRatio * otherStart;
                        timeSnap.addSnappedValue(myCandidateStart, otherNote);
                    }
                }
            }

            // Tone snaps
            if (this.snaps.hzEven === true) {
                toneSnap.addSnappedValue(frequencyToOctave(Math.round(targetHz / 2) * 2));
            };
            if (this.snaps.hzMult88 === true) {
                toneSnap.addSnappedValue(frequencyToOctave(Math.round(targetHz / 88) * 88));
            };
            if (this.snaps.hzMult44 === true) {
                toneSnap.addSnappedValue(frequencyToOctave(Math.round(targetHz / 44) * 44));
            };
            /** 
             * target / other = other * 1 / target
             * mycandidate = other
             **/
            if (this.snaps.hzRelationFraction === true) {
                if (otherNotes) {
                    for (const otherNote of otherNotes) {
                        const otherHz = otherNote.note.frequency;
                        const closeHzRatio = new Fraction(targetHz).div(otherHz).simplify(this.simplify).valueOf();
                        // reintegrate rounded proportion back to the other's hz value
                        const myCandidateHz = closeHzRatio * otherHz;
                        const myCandidateOctave = frequencyToOctave(myCandidateHz);
                        toneSnap.addSnappedValue(myCandidateOctave, otherNote);
                    }
                }
            }

            if (this.snaps.hzFundamentalMultiple === true) {
                toneSnap.addSnappedValue(frequencyToOctave(Math.round(targetHz / fundamental) * fundamental));
            }
            if (this.snaps.equal12 === true) {
                toneSnap.addSnappedValue(Math.round(targetOctave * 12) / 12);
            } else if (this.snaps.equal1 === true) {
                // else because equal1 is subset of equal 12
                toneSnap.addSnappedValue(Math.round(targetOctave));
            }

            editNote.note.octave = toneSnap.getResult();
            editNote.note.start = timeSnap.getResult();
            editNote.note.duration = durationSnap.getResult();

            return {
                editNote,
                relatedNotes
            }
        }
    },

});