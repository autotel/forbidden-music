import { defineStore } from 'pinia'
import { frequencyToOctave, makeNote, Note, octaveToFrequency } from '../dataTypes/Note.js';
import { Tool } from '../dataTypes/Tool.js';
import Fraction from 'fraction.js';
import { EditNote } from '../dataTypes/EditNote.js';

export const useToolStore = defineStore("tool", {
    state: () => ({
        current: Tool.Edit,
        simplify: 0.1,
        copyOnDrag: false,
    }),
    getters: {
    },
    actions: {
    },

});