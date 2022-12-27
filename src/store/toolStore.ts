import { defineStore } from 'pinia'
import { frequencyToOctave, makeNote, Note, octaveToFrequency } from '../dataTypes/Note.js';
import { Tool } from '../dataTypes/Tool.js';
import Fraction from 'fraction.js';

const fundamental = octaveToFrequency(0);
console.log("fundamental", fundamental);

/** modifies the provided snapObj! */
const snapper = (snapObj: {
    /** the smallest distance to a snap value found thus far */
    closestSnapDistance: number | null;
    /** the resulting value corresponding to the closest snap */
    closestSnapOctave: number | null;
    /** the calculated snap value, which contends to be the closest */
    snapValue: number | null;
    /** the target value, if no snap were to be applied */
    targetOctave: number | null;
}) => {
    if (snapObj.snapValue === null) {
        throw new Error("snapValue is null");
    }
    if (snapObj.targetOctave === null) {
        throw new Error("targetOctave is null");
    }
    const snapDistance = Math.abs(snapObj.snapValue - snapObj.targetOctave);
    if (snapObj.closestSnapDistance === null || snapDistance < snapObj.closestSnapDistance) {
        snapObj.closestSnapOctave = snapObj.snapValue;
        snapObj.closestSnapDistance = snapDistance;
    }
}

export const useToolStore = defineStore("tool", {
    state: () => ({
        current: Tool.Edit,
        simplify: 0.1,
        // TODO: when there is a snap, show a grid representing
        // the values to which it would snap, so that the user can target
        // visually
        snaps: {
            equal12: false,
            equal1: true,
            hzEven: false,
            hzRelationEven: true,
            /** A rational number multiplier of the fundamental, linearly*/
            hzFundamentalMultiple: false,
        }
    }),
    getters: {
        // this madness... I swear it's not my fault
        list: () => Object
            .values(Tool)
            .splice(0, Math.ceil(
                Object.keys(Tool).length / 2
            )),
    },
    actions: {
        getClosestFraction(value: number) {
            return new Fraction(value).simplify(this.simplify).valueOf();
        },
        snap(inNote: Note, targetOctave: number, otherNotes?: Array<Note>) {
            /** outNote */
            const note = inNote.clone();
            const targetHz = octaveToFrequency(targetOctave);
            const relatedNotes = [] as Note[];

            const snapObj = {
                closestSnapDistance: null as number | null,
                snapValue: null as number | null,
                closestSnapOctave: null as number | null,
                targetOctave,
            }

            if (this.snaps.hzEven === true) {
                snapObj.snapValue = frequencyToOctave(Math.round(targetHz / 2) * 2);
                snapper(snapObj);
            }
            // TODO: keep track of all the notes to which it has a relation
            // then filter all those notes with whom the relation was not used
            // and show them in the UI, using a dedicated component
            // take into account that a relationship might be hz or octave based.
            // there has to be a text explaining it (e.g. 1/6 hz, or 4/5 octaves)
            /** 
             * target / other = other * 1 / target
             * mycandidate = other
             **/
            if (this.snaps.hzRelationEven === true) {
                if (otherNotes) {
                    for (const otherNote of otherNotes) {
                        const otherHz = otherNote.frequency;
                        const closeHzRatio = new Fraction(targetHz).div(otherHz).simplify(this.simplify).valueOf();
                        // reintegrate rounded proportion back to the other's hz value
                        const myCandidateHz = closeHzRatio * otherHz;
                        const myCandidateOctave = frequencyToOctave(myCandidateHz);
                        snapObj.snapValue = myCandidateOctave;
                        snapper(snapObj);
                        if(snapObj.snapValue === myCandidateOctave) {
                            // TODO: show more than one note related (for example a note halfway between 1 and 2 snaps with both, not only one)
                            // also the fractions displayed are wrong very often.
                            relatedNotes.splice(0);
                            relatedNotes.push(otherNote);
                        }
                    }
                }
            }

            if (this.snaps.hzFundamentalMultiple === true) {
                snapObj.snapValue = frequencyToOctave(Math.round(targetHz / fundamental) * fundamental);
                snapper(snapObj);
            }
            if (this.snaps.equal12 === true) {
                snapObj.snapValue = Math.round(targetOctave * 12) / 12;
                snapper(snapObj);
            } else if (this.snaps.equal1 === true) {
                // else because equal1 is subset of equal 12
                snapObj.snapValue = Math.round(targetOctave);
                snapper(snapObj);
            }
            if (snapObj.closestSnapOctave === null) {
                note.octave = targetOctave;
            } else {
                note.octave = snapObj.closestSnapOctave;
            }

            return {
                note,
                relatedNotes
            }
        }
    },

});