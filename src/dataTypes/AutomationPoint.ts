import { SynthParam } from "../synth/SynthInterface";
import Draggable from "./Draggable";
import Selectable from "./Selectable";
import { TimePosition, ValuePosition } from "./TimelineItem";
import { TraceType } from "./Trace";


export type AutomationPointDef = {
  time: number;
  value: number;
  mute?: boolean;
  param: string;
}

export type AutomationPoint = TimePosition & Selectable & Draggable & ValuePosition & {
  type: TraceType.AutomationPoint;
  mute: boolean;
  param: SynthParam | undefined;
}

export const automationPoint = (
  automationPointDef: AutomationPointDef | AutomationPoint,
  availableSynthParams?: SynthParam[],
): AutomationPoint => {
  const value = automationPointDef.value || 0;
  const mute = automationPointDef.mute || false;
  let param: SynthParam | undefined;
  if (typeof automationPointDef.param === 'string') {
    if (!availableSynthParams) throw new Error('availableSynthParams is required for conversion from def to automation point');
    param = availableSynthParams.find(p => p.displayName === automationPointDef.param);
  } else {
    param = automationPointDef.param;
  }
  return {
    type: TraceType.AutomationPoint,
    time: automationPointDef.time,
    value,
    param,
    mute,
  };
}

export const automationPointDef = (ap: AutomationPoint): AutomationPointDef => {
  return {
    time: ap.time,
    value: ap.value,
    mute: ap.mute,
    param: ap.param?.displayName || '',
  }
}
