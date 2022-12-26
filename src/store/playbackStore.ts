import { defineStore } from 'pinia'
import { Note } from '../dataTypes/Note.js';
import { Tool } from '../dataTypes/Tool.js';
import { SawtoothSynth } from '../synth/SawtoothSynth';
import { BassicSynth } from '../synth/BassicSynth';
import { ToneSynth } from '../synth/ToneSynth';
import { useScoreStore } from './scoreStore';
import { useViewStore } from './viewStore';
import { Synth } from '../synth/Synth';
import * as Tone from 'tone';

export const usePlaybackStore = defineStore("playback", {
    state: () => ({
        playing: false,
        // time units per second?
        tempo: 10,
        /** in musical time */
        currentScoreTime: 0,
        /** in musical time */
        previousScoreTime: 0,
        currentTimeout: null as null | any,
        /** in seconds */
        previousClockTime: 0,

        audioContext: null as null | AudioContext,
        synth: new BassicSynth() as Synth,

        score: useScoreStore(),
        view: useViewStore(),

        playbarPxPosition: 0,

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
            if (this.audioContext) callback(this.audioContext);
            this.__awaitingAudioContext.push(callback);
        },
        _getEventsBetween(frameStartTime: number, frameEndTime: number) {
            const events = this.score.notes.filter((event) => {
                return event.start >= frameStartTime && event.start < frameEndTime;
            });
            return events;
        },
        _clockAction() {
            if (!this.audioContext) throw new Error("audio context not created");
            const now = this.audioContext.currentTime;
            const deltaTime = now - this.previousClockTime;
            this.previousClockTime = now;
            this.currentScoreTime += deltaTime * this.tempo;
            const playNotes = this._getEventsBetween(this.previousScoreTime, this.currentScoreTime);
            playNotes.forEach((note) => {

                this.synth.playNoteEvent(
                    note.start - this.previousScoreTime,
                    note.duration / this.tempo,
                    note.frequency,
                );
            });

            if (this.currentTimeout) clearTimeout(this.currentTimeout);
            this.currentTimeout = setTimeout(this._clockAction, 0);

            this.previousScoreTime = this.currentScoreTime;

            // TODO: mapping direction weirdness :/ 
            this.playbarPxPosition = this.view.pxToTimeWithOffset(this.currentScoreTime);
        },
        play() {
            this.getAudioContextThen(() => {
                this.playing = true;
                if (this.currentTimeout) throw new Error("timeout already exists");
                if (!this.audioContext) throw new Error("audio context not created");
                this.previousClockTime = this.audioContext.currentTime;
                this.currentTimeout = setTimeout(this._clockAction, 0);
            });
        },
        stop() {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
            this.playing = false;
            this.currentScoreTime = 0;
            this.previousScoreTime = 0;
            this.playbarPxPosition = 0;
            this.previousClockTime = 0;
            this.synth.stopAllNotes();
        },
        pause() {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
            this.playing = false;
        },
    },

});