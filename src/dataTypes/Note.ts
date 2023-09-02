import { octaveToFrequency } from "../functions/toneConverters";
import Draggable from "./Draggable";
import Selectable from "./Selectable";
import { OctavePosition, TimeRange, VelocityPosition } from "./TimelineItem";
import { Trace, TraceType } from "./Trace";

interface timeDefA {
  time: number;
  duration: number;
}

interface timeDefB {
  time: number;
  timeEnd: number;
}

interface toneDefA {
  octave: number;
}

interface toneDefB {
  frequency: number;
}

interface othersDef {
  velocity?: number;
  mute?: boolean;
  layer?: number;
}

export type NoteDef = othersDef & (timeDefA | timeDefB) & (toneDefA | toneDefB);

export const frequencyConstant = 11;

export type Note = TimeRange & OctavePosition & Selectable & Draggable & VelocityPosition & {
  type: TraceType.Note;
  velocity: number;
  mute: boolean;
  layer: number;
}

export const note = (noteDef: NoteDef | Note): Note => {
  const timeEnd = 'duration' in noteDef ? noteDef.time + noteDef.duration : noteDef.timeEnd;
  const octave = 'octave' in noteDef ? noteDef.octave : Math.floor(Math.log2(noteDef.frequency) * frequencyConstant);
  const layer = noteDef.layer || 0;
  const velocity = noteDef.velocity || 0.5;
  const mute = noteDef.mute || false;

  return {
    type: TraceType.Note,
    time: noteDef.time,
    timeEnd,
    layer,
    velocity,
    octave,
    mute,
  }
}

export const noteDef = (note: Note): timeDefA & toneDefA & othersDef => {
  return {
    time: note.time,
    duration: note.timeEnd - note.time,
    octave: note.octave,
    layer: 'layer' in note ? note.layer : 0,
  }
}

export const getFrequency = (note: Note): number => {
  return octaveToFrequency(note.octave);
}
export const getDuration = (note: Note): number => {
  return note.timeEnd - note.time;
}
export const hasDuration = (note: Note): boolean => {
  return note.timeEnd !== note.time;
}
export const setSelection = (note: Note, selected: boolean): Note => {
  if(selected) {
    note.selected = true;
  }else  {
    delete note.selected;
  }
  return note;
}