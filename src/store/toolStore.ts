import { defineStore } from 'pinia'
import { Note } from '../dataTypes/Note.js';
import { Tool } from '../dataTypes/Tool.js';
import Fraction from 'fraction.js';
export const useToolStore = defineStore("tool", {
    state: () => ({
        current: Tool.Edit,
        simplify: 0.01,
        snaps: {
            fraction: false,
            equal12: true,
            equal1: true,
            // toneGrid: false,
            // timeGrid: false,
            // toneFractions: false,
            // toneRulers: false,
            // relation2: false,
            // relation3: false,
            // relation4: false,
            // relation5: false,
            // relation6: false,
            // relation7: false,
            // relation8: false,
            // relation9: false,
            // relation10: false,
            // relation11: false,
            // relation12: false,
            // ... etc
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
        snap(note: Note, targetOctave: number, otherNotes?: Array<Note>) {

            let closestSnapValue = null as number | null;
            let closestSnapDistance = null as number | null;

            if (this.snaps.equal12 === true) {
                const snapValue = Math.round(targetOctave * 12) / 12;
                const snapDistance = Math.abs(snapValue - targetOctave);
                if (closestSnapDistance === null || snapDistance < closestSnapDistance) {
                    closestSnapValue = snapValue;
                    closestSnapDistance = snapDistance;
                }
            } else if (this.snaps.equal1 === true) {
                // else because equal1 is subset of equal 12
                const snapValue = Math.round(targetOctave);
                const snapDistance = Math.abs(snapValue - targetOctave);
                if (closestSnapDistance === null || snapDistance < closestSnapDistance) {
                    closestSnapValue = snapValue;
                    closestSnapDistance = snapDistance;
                }
            }
            if (closestSnapValue === null) {
                note.octave = targetOctave;
                console.log("any val");
            } else {
                note.octave = closestSnapValue;
                console.log("snap val");
            }

            console.log(closestSnapValue);
            return note;
        }
    },

});