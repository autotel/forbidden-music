import { defineStore } from 'pinia'
import { Note } from '../dataTypes/Note.js';
import { Tool } from '../dataTypes/Tool.js';

export const usePlaybackStore = defineStore("playback", {
    state: () => ({
        playing: false,
        // time units per second?
        tempo: 4,
        currentScoreTime: 0,
        currentTimeout: null,
        previousClockTime: 0,

    }),
    getters: {
        paused: (state) => (!state.playing) && state.currentScoreTime != 0,
        stopped: (state) => (!state.playing) && state.currentScoreTime == 0,
        getNextEvents: () => [],
    },
    actions: {
        _clockAction() {
            const now = new Date().getTime();
            const deltaTime = now - this.previousClockTime;
            this.previousClockTime = now;
            this.currentScoreTime += deltaTime * this.tempo / 1000;
            
            this.currentTimeout = setTimeout(this._clockAction,10);
        },
        play() {
            this.playing = true;
            if (this.currentTimeout) throw new Error("timeout already exists");
            this.previousClockTime = new Date().getTime();
            this.currentTimeout = setTimeout(this._clockAction,10);
        },
        stop() {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
            this.playing = false;
            this.currentScoreTime = 0;
        },
        pause() {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
            this.playing = false;
        },
    },

});