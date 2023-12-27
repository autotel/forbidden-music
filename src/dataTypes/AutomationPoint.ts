import Draggable from "./Draggable";
import Selectable from "./Selectable";
import { TimePosition, ValuePosition } from "./TimelineItem";
import { TraceType } from "./Trace";

/** exportable/ importable definition of an Automation Point */
export type AutomationPointDef = {
  time: number;
  value: number;
  mute?: boolean;
  layer: number;
}

export type AutomationPoint = TimePosition & Selectable & Draggable & ValuePosition & {
  type: TraceType.AutomationPoint;
  mute: boolean;
  layer: number;
}

export const automationPoint = (
  automationPointDef: AutomationPointDef | AutomationPoint
): AutomationPoint => {
  const value = automationPointDef.value || 0;
  const mute = automationPointDef.mute || false;
  const layer = automationPointDef.layer || 0;

  return {
    type: TraceType.AutomationPoint,
    time: automationPointDef.time,
    value,
    layer,
    mute,
  };
}

export const automationPointDef = (ap: AutomationPoint): AutomationPointDef => {
  return {
    time: ap.time,
    value: ap.value,
    mute: ap.mute,
    layer: ap.layer,
  }
}
