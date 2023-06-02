import { createFmWorklet } from '../functions/fmWorkletFactory';
import { baseFrequency, frequencyToMidiNote, frequencyToNote12, frequencyToOctave } from '../functions/toneConverters';
import { SynthInstance, SynthParam } from "./SynthInterface";


interface FmStopVoiceMessage {
    stop: true;
    ref: string;
}

interface FmStopAllMessage {
    stopall: true;
}

interface FmStartVoiceMessage {
    freq: number;
    amp: number;
    duration?: number;
    ref: string;
}
// TODO: 
interface FmParamsChangeMessage {
    bleed?: number;
    impulseDecay?: number;
    impulseAttack?: number;
    delaysDetune?: number;
}
// TODO: make polyphonic
export class FmSynth implements SynthInstance {
    private audioContext?: AudioContext;
    gainNode?: GainNode;
    engine?: AudioWorkletNode;
    enable: () => void
    disable: () => void
    constructor(audioContext: AudioContext) {
        this.setAudioContext(audioContext);
        // TODO... or not
        this.enable = () => { }
        this.disable = () => { }
    }


    async setAudioContext(audioContext: AudioContext) {
        if (this.audioContext) {
            throw new Error("audio context already set");
        }
        this.audioContext = audioContext;
        this.engine = await createFmWorklet(audioContext);
        this.gainNode = this.audioContext.createGain();
        this.engine.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
    }

    releaseAll = () => {
        console.log("stopping all notes");
        if (this.engine) this.engine.port.postMessage({ stopall: true } as FmStopAllMessage);
    };

    name = "Fm";
    triggerAttackRelease = (
        frequency: number,
        duration: number,
        relativeNoteStart: number,
        velocity: number
    ) => {
        if (!this.audioContext) throw new Error("audio context not created");
        if (!this.engine) throw new Error("engine not created");
        // const startTime = this.audioContext.currentTime + relativeNoteStart;
        const note = frequencyToNote12(frequency);
        console.log("trig note", note);
        // TODO: maybe use frequency directly, would need to edit the worklet
        this.engine.port.postMessage({
            noteOn: {
                key: note,
            }
        });
        setTimeout(() => {
            if (!this.engine) throw new Error("engine not created");
            this.engine.port.postMessage({
                noteOff: {
                    key: note,
                }
            });
        }, duration * 1000);
    };
    triggerPerc = (frequency: number, relativeNoteStart: number, velocity: number) => {
        this.triggerAttackRelease(frequency, 0.7, relativeNoteStart, velocity);
    };


    params = [] as SynthParam[];
    credits = `
    Worklet from https://github.com/kazssym/web-fm-sound

    Copyright (C) 2020 Kaz Nishimura
    
    This program is free software: you can redistribute it and/or modify it
    under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or (at your
    option) any later version.
    
    This program is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
    FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
    for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
    
    SPDX-License-Identifier: AGPL-3.0-or-later

    This file is a module script and shall be in strict mode by default.
    `

}