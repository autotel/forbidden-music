import {
  frequencyToOctave,
  octaveToFrequency,
} from "../functions/toneConverters";

// export interface Note {
//     /** start in musical time */
//     start: number,
//     /** duration in musical time */
//     duration?: number,
//     /** note in octaves */
//     octave: number,
//     /** frequency hertz */
//     frequency: number,
//     /** end */
//     end?: number | undefined,
//     mute: boolean;
//     velocity: number;
//     clone: <T>() => T,
// }

export interface NoteDefa {
  start: number;
  duration?: number;
  octave: number;
  mute?: boolean;
  velocity?: number;
}
export interface NoteDefb {
  start: number;
  duration?: number;
  frequency: number;
  mute?: boolean;
  velocity?: number;
}

export const frequencyConstant = 11;
// TODO: refactor
/**
export const makeNote = (noteDef: NoteDefa | NoteDefb): Note => {
    const nn = {
        start: noteDef.start,
        duration: noteDef.duration,
        _octave: null as number | null,
        _frequency: null as number | null,
        selected: false,
        mute: noteDef.mute || false ,
        velocity: noteDef.velocity || 0.7,
        clone() { return makeNote(this) },
        set end(value: number | undefined) {
            if (value === undefined) {
                delete this.duration;
                return
            }
            this.duration = value - this.start;
            if (this.duration < 0) {
                throw new Error("end is less than start");
            }
        },
        get end() {
            return this.duration ? this.start + this.duration : undefined;
        },
        set octave(value: number) {
            this._octave = value;
            this._frequency = octaveToFrequency(value);
        },
        get octave() {
            if (this._octave === null) throw new Error("octave is null");
            return this._octave;
        },
        set frequency(value: number) {
            this._frequency = value;
            this._octave = frequencyToOctave(value);
        },
        get frequency() {
            if (this._frequency === null) throw new Error("freqency is null");
            return this._frequency;
        },
    }
    nn.frequency = "frequency" in noteDef ? noteDef.frequency : octaveToFrequency(noteDef.octave)
    // nn.octave = "octave" in noteDef ? noteDef.octave : frequencyToOctave(noteDef.frequency)
    return nn as Note;
}
*/

export class Note {
  start: number;
  duration?: number;
  selected: boolean;
  mute: boolean;
  velocity: number;
  _octave: number | null;
  _frequency: number | null;

  apply(noteDef: NoteDefa | NoteDefb) {
    this.start = noteDef.start;
    this.duration = noteDef.duration;
    this.selected = false;
    this.mute = noteDef.mute || false;
    this.velocity = noteDef.velocity || 0.7;
    this.frequency =
      "frequency" in noteDef
        ? noteDef.frequency
        : octaveToFrequency(noteDef.octave);
  }

  clone() {
    return new Note({
      start: this.start,
      duration: this.duration,
      octave: this.octave,
      mute: this.mute,
      velocity: this.velocity,
    });
  }

  set end(value: number | undefined) {
    if (value === undefined) {
      delete this.duration;
      return;
    }
    this.duration = value - this.start;
    if (this.duration < 0) {
      throw new Error("end is less than start");
    }
  }
  get end() {
    return this.duration ? this.start + this.duration : undefined;
  }
  set frequency(value: number) {
    this._frequency = value;
    this._octave = frequencyToOctave(value);
  }
  set octave(value: number) {
    this._octave = value;
    this._frequency = octaveToFrequency(value);
  }
  get frequency() {
    if (this._frequency === null) throw new Error("freqency is null");
    return this._frequency;
  }
  get octave() {
    if (this._octave === null) throw new Error("octave is null");
    return this._octave;
  }
  constructor(noteDef: NoteDefa | NoteDefb) {
    this.start = 0;
    this.duration = 0;
    this.selected = false;
    this.mute = false;
    this.velocity = 0;
    this.frequency = 0;
    this._octave = null;
    this._frequency = null;

    this.apply(noteDef);
  }
}
