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
        viewHeightOctaves: 16,
        // size of the composition, to use as reference to scroll bounds
        scrollBound: 2048,
        // TODO: integrate this, so that view always zooms to center or mouse pos.
        _offsetPxX: 1920 / 2,
        _offsetPxY: 1080,
    }),
    getters: {
    },
    actions: {
        setTimeOffset(timeOffset: number) {
            this.timeOffset = timeOffset;
        },
        setTimeOffsetBounds(timeOffsetBounded: number) {
            this.timeOffset = this.boundsToTime(timeOffsetBounded);
        },
        pxToBounds(px: number): number {
            return px / this.viewWidthPx;
        },
        timeToPxWithOffset(time: number): number {
            return this.pxToTime(time) + this.timeOffset;
            // return (time * this.viewWidthTime / this.viewWidthPx + this.timeOffset) ;
        },
        pxToTimeWithOffset(px: number): number {
            return this.timeToPx(px - this.timeOffset);
            // return (px - this.timeOffset) * this.viewWidthPx / this.viewWidthTime;
        },
        timeToBounds(time: number): number {
            return time / this.scrollBound;
        },
        boundsToTime(bounds: number): number {
            return bounds * this.scrollBound;
        },
        pxToTime(time: number): number {
            return time * this.viewWidthTime / this.viewWidthPx;
        },
        timeToPx(px: number): number {
            return px * this.viewWidthPx / this.viewWidthTime;
        },
        pxToOctave(px: number): number {
            return px * - this.viewHeightOctaves / this.viewHeightPx;
        },
        octaveToPx(octave: number): number {
            return octave * this.viewHeightPx / - this.viewHeightOctaves;
        },
        pxToOctaveOffset(px: number): number {
            return this.pxToOctave(px - this._offsetPxY) - this.octaveOffset;
        },
        octaveToPxOffset(octaveOffset: number): number {
            return this.octaveToPx(octaveOffset + this.octaveOffset) + this._offsetPxY;
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
            this._offsetPxX = width / 2;
        },
    },

});