import { defineStore } from 'pinia'
import { Note } from '../dataTypes/Note.js';
import { Tool } from '../dataTypes/Tool.js';

export const useToolStore = defineStore("tool", {
    state: () => ({
        current: Tool.Edit,
        snaps: {
            toneGrid: false,
            timeGrid: false,
            toneFractions: false,
            // ... etc
        },
    }),
    getters: {
        // this madness... I swear it's not my fault
        list: () => Object
            .values(Tool)
            .splice(0,Math.ceil(
                Object.keys(Tool).length/2
            )),
    },
    actions: {
    },

});