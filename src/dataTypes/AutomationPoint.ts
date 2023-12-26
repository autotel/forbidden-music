import Draggable from "./Draggable";
import Selectable from "./Selectable";
import { TimePosition, ValuePosition } from "./TimelineItem";
import { TraceType } from "./Trace";


export type AutomationPointDef = {
  time: number;
  value: number;
  mute?: boolean;
  layer?: number;
}

export type AutomationPoint = TimePosition & Selectable & Draggable & ValuePosition & {
  type: TraceType.AutomationPoint;
  mute: boolean;
  layer: number;
}

export const automationPoint = (automationPointDef: AutomationPointDef | AutomationPoint): AutomationPoint => {
  const layer = automationPointDef.layer || 0;
  const value = automationPointDef.value || 0;
  const mute = automationPointDef.mute || false;

  return {
    type: TraceType.AutomationPoint,
    time: automationPointDef.time,
    value,
    layer,
    mute,
  };
}

export const automationPointDef = (note: AutomationPoint): AutomationPointDef => {
  return {
    time: note.time,
    value: note.value,
    mute: note.mute,
    layer: 'layer' in note ? note.layer : 0,
  }
}
