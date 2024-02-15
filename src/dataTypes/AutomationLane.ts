import { SynthParam } from "../synth/super/SynthInterface"
import { AutomationPoint, AutomationPointDef, automationPoint, automationPointDef } from "./AutomationPoint"
/** exportable/ importable definition of a automationLane */
interface AutomationLaneDefA {
    displayName: string
    targetParameter: string | undefined
    content: AutomationPointDef[]
}
/** exportable/ importable definition of a automationLane */
interface AutomationLaneDefB {
    displayName: string
    targetParameter: SynthParam | undefined
    content: AutomationPoint[]
}


/** 'alive' automationLane format */
export interface AutomationLane {
    displayName: string
    targetParameter?: SynthParam
    content: AutomationPoint[]
    sizeWhenLastSorted?: number
}

export type AutomationLaneDef = AutomationLaneDefA | AutomationLaneDefB | AutomationLane

/** parse exportable format into 'alive' format */
export const automationLane = (automationLaneDef: AutomationLaneDef): AutomationLane => {
    return {
        displayName: automationLaneDef.displayName,
        content: automationLaneDef.content.map(automationPoint),
        targetParameter: undefined,
    }
}
/** AutomationLane in an exportable format */
export const automationLaneDef = (automationLane: AutomationLane): AutomationLaneDefA => {
    return {
        displayName: automationLane.displayName,
        content: automationLane.content.map(automationPointDef),
        targetParameter: automationLane.targetParameter?.displayName,
    }
}