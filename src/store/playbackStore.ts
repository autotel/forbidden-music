import { defineStore } from 'pinia';
import { getAudioContext, waitRunningContext } from '../functions/audioContextGetter';
import { CollisionSynth } from '../synth/CollisionSynth';
import { Synth } from '../synth/Synth';
import { useScoreStore } from './scoreStore';
import { useViewStore } from './viewStore';
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

        audioContext: getAudioContext(),

        // choose the synth
        synth: new CollisionSynth() as Synth,

        score: useScoreStore(),
        view: useViewStore(),

        playbarPxPosition: 0,
        playFrameSizeMs: 30,

    }),
    getters: {
        paused: (state) => (!state.playing) && state.currentScoreTime != 0,
        stopped: (state) => (!state.playing) && state.currentScoreTime == 0,
    },
    actions: {
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
            this.currentTimeout = setTimeout(this._clockAction, this.playFrameSizeMs);

            this.previousScoreTime = this.currentScoreTime;

            // TODO: mapping direction weirdness :/ 
            this.playbarPxPosition = this.view.pxToTimeWithOffset(this.currentScoreTime);
        },
        play() {
            waitRunningContext().then(() => {
                this.playing = true;
                if (this.currentTimeout) throw new Error("timeout already exists");
                this.previousClockTime = this.audioContext.currentTime;
                this.currentTimeout = setTimeout(this._clockAction, 0);
                this.synth.setAudioContext(this.audioContext);
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