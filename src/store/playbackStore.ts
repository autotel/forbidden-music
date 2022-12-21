import { defineStore } from 'pinia'
import { Note } from '../dataTypes/Note.js';
import { Tool } from '../dataTypes/Tool.js';
import { SawtoothSynth } from '../synth/SawtoothSynth.js';
import { useScoreStore } from './scoreStore.js';
import { useViewStore } from './viewStore.js';

export const usePlaybackStore = defineStore("playback", {
    state: () => ({
        playing: false,
        // time units per second?
        tempo: 4,
        currentScoreTime: 0,
        previousScoreTime: 0,
        currentTimeout: null as null | any,
        previousClockTime: 0, // seconds
        lastPlayedFrameTime: 0, // seconds

        audioContext: null as null | AudioContext,
        synth: new SawtoothSynth(),
        foresight: 0.1, // seconds

        score: useScoreStore(),
        view: useViewStore(),

        __awaitingAudioContext: [] as ((audioContext: AudioContext) => void)[],
    }),
    getters: {
        paused: (state) => (!state.playing) && state.currentScoreTime != 0,
        stopped: (state) => (!state.playing) && state.currentScoreTime == 0,
    },
    actions: {
        startAudioContext() {
            if (this.audioContext) return;
            const ac = this.audioContext = new AudioContext();
            if (!this.audioContext) throw new Error("audio context not created");
            this.synth.setAudioContext(ac);
            this.__awaitingAudioContext.forEach((callback) => callback(ac));
            console.log("created audio context");
        },
        getAudioContextThen(callback: (audioContext: AudioContext) => void) {
            if (this.audioContext) return this.audioContext;
            this.__awaitingAudioContext.push(callback);
        },
        _getEventsBetween(frameStartTime: number, frameEndTime: number) {
            const events = this.score.notes.filter((event) => {
                return event.start >= frameStartTime && event.start < frameEndTime;
            });
            return events;
        },
        _clockAction() {
            const now = new Date().getTime();
            const deltaTime = now - this.previousClockTime;
            this.previousClockTime = now;
            this.currentScoreTime += deltaTime * this.tempo / 1000;
            this.currentTimeout = setTimeout(this._clockAction, 10);
            const playNotes = this._getEventsBetween(this.previousScoreTime, this.currentScoreTime);
            playNotes.forEach((note) => {
                const frequency = 50 * 2 ** (note.octave - 2);
                console.log("playing note", note.octave, frequency);
                this.synth.playNoteEvent(note.start - this.previousScoreTime , note.duration, frequency);
            });
            this.previousScoreTime = this.currentScoreTime;
        },
        play() {
            this.playing = true;
            if (this.currentTimeout) throw new Error("timeout already exists");
            this.previousClockTime = new Date().getTime();
            this.currentTimeout = setTimeout(this._clockAction, this.foresight / 2000);
        },
        stop() {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
            this.playing = false;
            this.currentScoreTime = 0;
            this.lastPlayedFrameTime = 0;
        },
        pause() {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
            this.playing = false;
        },
    },

});