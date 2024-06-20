import { createFmWorklet } from '../functions/fmWorkletFactory';
import { frequencyToNote12 } from '../functions/toneConverters';
import { EventParamsBase, Synth, SynthVoice } from './super/Synth';


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

const voiceFactory = ({ engine }: { engine: AudioWorkletNode }): SynthVoice & { [key: string]: any } => ({
    inUse: false,
    triggerStarted: 0,
    triggeredVelocity: 0,
    triggeredNote: 0,
    currentReleaseTimeout: null as null | ReturnType<typeof setTimeout>,

    scheduleStart(
        frequency: number,
        absoluteStartTime: number,
        { velocity }: EventParamsBase
    ) {
        if (this.currentReleaseTimeout !== null) {
            clearTimeout(this.currentReleaseTimeout);
            this.currentReleaseTimeout = null;
        }
        this.inUse = true;
        this.triggerStarted = absoluteStartTime;
        this.triggeredVelocity = velocity;
        const note = frequencyToNote12(frequency);
        this.triggeredNote = note;
        console.log("trig note", note);
        // TODO: maybe use frequency directly, would need to edit the worklet
        // TODO: schedule start, don't start right away
        engine.port.postMessage({
            noteOn: {
                key: note,
            }
        });
        return this;
    },
    scheduleEnd(absoluteStopTime?: number) {
        if (absoluteStopTime) {
            const duration = absoluteStopTime - this.triggerStarted;
            this.currentReleaseTimeout = setTimeout(() => {
                this.stop();
            }, duration * 1000);
        } else {
            this.stop();
        }
        return this;
    },
    stop() {
        engine.port.postMessage({
            noteOff: {
                key: frequencyToNote12(this.triggeredNote)
            }
        });
        this.inUse = false;
        return this;
    }
})
// TODO: make polyphonic
export class FmSynth extends Synth {
    engine?: AudioWorkletNode;
    constructor(audioContext: AudioContext) {
        super(audioContext, () => {
            if (!this.engine) throw new Error("No engine");
            const engine = this.engine;
            return voiceFactory({ engine })
        });
        this.output.gain.value = 0.6;
        this.audioContext = audioContext;
        createFmWorklet(audioContext).then((engine) => {
            this.engine = engine;
            this.engine.connect(this.output);
        });
    }
    releaseAll = () => {
        console.log("stopping all notes");
        if (this.engine) this.engine.port.postMessage({ stopall: true } as FmStopAllMessage);
    };

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