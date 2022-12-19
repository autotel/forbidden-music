import { defineStore } from 'pinia'
import { ref, Ref } from 'vue';
import { View } from '../View.js';

export const useViewStore = defineStore("view", {
    // const view: Ref<View> = ref(new View(1920, 1080, 1024, 3));
    state: () => ({
        octaveOffset: 2,
        timeOffset: 8,
        centerFrequency: 440,
        viewWidthPx: 1920,
        viewHeightPx: 1080,
        viewWidthTime: 1024,
        viewHeightOctaves: 4,
    }),
    getters: {
    },
    actions: {
        pxToTime(px: number): number {
            return px * this.viewWidthPx / this.viewWidthTime;
        },
        timeToPx(time: number): number {
            return time * this.viewWidthTime / this.viewWidthPx;
        },
        pxToOctave(px: number): number {
            return px * this.viewHeightOctaves / this.viewHeightPx;
        },
        octaveToPx(octave: number): number {
            return octave * this.viewHeightPx / this.viewHeightOctaves;
        },
        octaveToFrequency(octave: number): number {
            return this.centerFrequency * Math.pow(2, octave - this.octaveOffset);
        },
        frequencyToOctave(frequency: number): number {
            return Math.log2(frequency / this.centerFrequency) + this.octaveOffset;
        },
        updateSize(width: number, height: number) {
            this.viewWidthPx = width;
            this.viewHeightPx = height;
        }
    },

});