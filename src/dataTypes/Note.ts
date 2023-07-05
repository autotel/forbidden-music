import {
  frequencyToOctave,
  octaveToFrequency,
} from "../functions/toneConverters";
import { TimeRangeOctaveSelectable } from "./TimelineItem";


export interface NoteDefa {
  time: number;
  duration?: number;
  octave: number;
  mute?: boolean;
  velocity?: number;
}
export interface NoteDefb {
  time: number;
  duration?: number;
  frequency: number;
  mute?: boolean;
  velocity?: number;
}

export const frequencyConstant = 11;

export class Note implements TimeRangeOctaveSelectable{
  /** time in score time */
  time: number;
  /** duration in score time */
  duration: number;
  selected: boolean;
  mute: boolean;
  velocity: number;
  _octave: number | null;
  _frequency: number | null;

  apply(noteDef: NoteDefa | NoteDefb) {
    this.time = noteDef.time;
    this.duration = noteDef.duration || 0;
    this.selected = false;
    this.mute = noteDef.mute || false;
    this.velocity = 0.7;
    if('velocity' in noteDef){
      this.velocity = noteDef.velocity as number;
    }
    this.frequency =
      "frequency" in noteDef
        ? noteDef.frequency
        : octaveToFrequency(noteDef.octave);
  }

  clone() {
    return new Note({
      time: this.time,
      duration: this.duration,
      octave: this.octave,
      mute: this.mute,
      velocity: this.velocity,
    });
  }

  get timeEnd(): number {
    return this.duration ? this.time + this.duration : this.time;
  }
  set timeEnd(value: number | undefined) {
    if (value === undefined) {
      this.duration = 0;
      return;
    }
    this.duration = value - this.time;
    if (this.duration < 0) {
      throw new Error("end is less than time");
    }
  }

  get octave() {
    if (this._octave === null) throw new Error("octave is null");
    return this._octave;
  }
  set octave(value: number) {
    this._octave = value;
    this._frequency = octaveToFrequency(value);
  }

  get frequency() {
    if (this._frequency === null) throw new Error("freqency is null");
    return this._frequency;
  }
  set frequency(value: number) {
    this._frequency = value;
    this._octave = frequencyToOctave(value);
  }

  constructor(noteDef: NoteDefa | NoteDefb) {
    this.time = 0;
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
