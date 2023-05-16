// from https://github.com/kazssym/web-fm-sound/blob/master/resources/fm-synthesizer.js
// fm-synthesizer.js
// Copyright (C) 2020 Kaz Nishimura
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
// for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/* global sampleRate */

/**
 * Module script for the audio worklet processors.
 * This file must be imported by an
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet AudioWorklet}
 * object.
 *
 * @module fm-synthesizer.js
 */

// This file is a module script and shall be in strict mode by default.

const TWO_PI = 2 * Math.PI;

const A3_KEY = 69;

class FMOperator
{
    /**
     *
     * @param {number} index an index for arrays
     * @param {Object} voice voice parameters shared among operators
     */
    constructor(index, voice)
    {
        this._index = index;
        this._voice = voice;
        this._totalLevel = 0.0;
        this._multiple = 1.0;

        this._decay1Rate = 0.0;
        this._decay1Level = 0.0;
        this._decay2Rate = 0.0;

        this._output = 0.0;
        this._phase = 0.0;

        this._started = false;
        this._envelope = null;
    }

    /**
     * Index of this operator given to the constructor.
     */
    get index()
    {
        return this._index;
    }

    /**
     * Amplitude of this operator.
     */
    get totalLevel()
    {
        return this._totalLevel;
    }

    set totalLevel(totalLevel)
    {
        if (totalLevel < 0 || totalLevel > 1.0) {
            throw new Error("totalLevel out of range");
        }
        this._totalLevel = totalLevel;
    }

    /**
     * Frequency multiple of this operator.
     */
    get multiple()
    {
        return this._multiple;
    }

    set multiple(multiple)
    {
        this._multiple = multiple;
    }

    get decay1Rate()
    {
        return this._decay1Rate;
    }

    set decay1Rate(decay1Rate)
    {
        if (decay1Rate < 0 || decay1Rate > 1.0) {
            throw new Error("decay1Rate out of range");
        }
        this._decay1Rate = decay1Rate;
    }

    get decay1Level()
    {
        return this._decay1Lvel;
    }

    set decay1Level(decay1Level)
    {
        if (decay1Level < 0 || decay1Level > 1.0) {
            throw new Error("decay1Level out of range");
        }
        this._decay1Level = decay1Level;
    }

    get decay2Rate()
    {
        return this._decay2Rate;
    }

    set decay2Rate(decay2Rate)
    {
        if (decay2Rate < 0 || decay2Rate > 1.0) {
            throw new Error("decay2Rate out of range");
        }
        this._decay2Rate = decay2Rate;
    }

    /**
     * Output of this operator.
     */
    get output()
    {
        return this._output;
    }

    advance(modulation = 0)
    {
        let output = 0;
        if (this._envelope != null) {
            let {value, done} = this._envelope.next();
            if (!done) {
                output = this._totalLevel * value
                    * Math.sin(TWO_PI * (this._phase + 4 * modulation));
            }
        }
        this._output = output;

        this._phase += this._multiple * this._voice.phaseIncrement;
        this._phase -= Math.floor(this._phase);
    }

    start()
    {
        this._started = true;

        // TODO: make a real envelope generator.
        function* envelope() {
            let level = 1.0;
            while (this._started && level > this._decay1Level) {
                yield level;
                level *= this._decay1Rate;
            }
            while (this._started) {
                yield level;
                level *= this._decay2Rate;
            }
        }
        this._envelope = envelope.call(this);
    }

    stop()
    {
        this._started = false;
    }
}

class FMSynthesizer extends AudioWorkletProcessor
{
    constructor(options)
    {
        super(options);
        this._voice = {
            key: A3_KEY,
            phaseIncrement: 440 / sampleRate,
        };
        this._operators = [0, 1, 2, 3]
            .map((index) => new FMOperator(index, this._voice));

        this._connection = [
            [0, 0, 0, 0],
            [1, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 1, 0],
            [0, 1, 0, 1],
        ];

        this._operators[0].totalLevel = 1.0;
        this._operators[1].totalLevel = Math.pow(2, -3.0);
        this._operators[2].totalLevel = Math.pow(2, -0.5);
        this._operators[3].totalLevel = Math.pow(2, -3.0);
        this._operators[0].multiple = 14.0;
        this._operators[1].multiple = 1.0;
        this._operators[2].multiple = 1.0;
        this._operators[3].multiple = 1.0;

        this._operators[0].decay1Rate = Math.pow(2, -8.0 / sampleRate);
        this._operators[1].decay1Rate = Math.pow(2, -3.0 / sampleRate);
        this._operators[2].decay1Rate = Math.pow(2, -1.0 / sampleRate);
        this._operators[3].decay1Rate = Math.pow(2, -1.0 / sampleRate);
        this._operators[0].decay1Level = Math.pow(2, -1.0);
        this._operators[1].decay1Level = Math.pow(2, -1.0);
        this._operators[2].decay1Level = 0;
        this._operators[3].decay1Level = 0;
        this._operators[0].decay2Rate = Math.pow(2, -4.0 / sampleRate);
        this._operators[1].decay2Rate = Math.pow(2, -4.0 / sampleRate);
        this._operators[2].decay2Rate = 0;
        this._operators[3].decay2Rate = 0;

        // Gets note-ons/offs as messages.
        this.port.addEventListener("message", (event) => {
            console.debug("data = %o", event.data);
            this.handleMessage(event.data);
        });
        this.port.start();
    }

    handleMessage(message)
    {
        if ("noteOn" in message) {
            if ("key" in message.noteOn) {
                this._voice.key = message.noteOn.key;
                this._voice.phaseIncrement = 440 / sampleRate
                    * Math.pow(2, (message.noteOn.key - A3_KEY) / 12);
            }
            this._operators
                .forEach((o) => {
                    o.start();
                });
        }
        if ("noteOff" in message) {
            if (this._voice.key == message.noteOff.key) {
                this._operators
                    .forEach((o) => {
                        o.stop();
                    });
            }
        }
    }

    /**
     * Processes audio samples.
     *
     * @param {Float32Array[][]} _inputs input buffers to be ignored
     * @param {Float32Array[][]} outputs output buffers
     * @return {boolean} true
     */
    process(_inputs, outputs)
    {
        if (outputs.length >= 1) {
            for (let k = 0; k < outputs[0][0].length; ++k) {
                for (let i = 0; i < 4; i++) {
                    let modulation = this._operators
                        .reduce((sum, o) =>
                            sum + this._connection[i][o.index] * o.output,
                            0);
                    this._operators[i].advance(modulation);
                }

                let sample = this._operators
                    .reduce((sum, o) =>
                        sum + this._connection[4][o.index] * o.output,
                        0);
                outputs.forEach((output) => {
                    output.forEach((channel) => {
                        channel[k] = sample;
                    });
                });
            }
        }
        return true;
    }
}

registerProcessor("fm-synthesizer", FMSynthesizer);
