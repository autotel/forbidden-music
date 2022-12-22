import { defineStore } from 'pinia'
import { Note } from '../dataTypes/Note.js';
import { Tool } from '../dataTypes/Tool.js';
import Fraction from 'fraction.js';
export const useToolStore = defineStore("tool", {
    state: () => ({
        current: Tool.Edit,
        simplify: 0.01,
        snaps: {
            fraction: true,
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
        getClosestFraction(value:number) {
            return new Fraction(value).simplify(this.simplify).valueOf();
        },
    },

});