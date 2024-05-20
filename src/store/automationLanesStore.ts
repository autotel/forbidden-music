import { defineStore } from "pinia";
import { ref, watchEffect } from "vue";
import { AutomationLane, AutomationLaneDef, automationLane, automationLaneDef } from "../dataTypes/AutomationLane";
import { AutomationPoint, automationPoint } from "../dataTypes/AutomationPoint";
import { useSynthStore } from "./synthStore";
import { SynthParam } from "../synth/interfaces/SynthParam";
import { AutomatableSynthParam, isAutomatable } from "../synth/interfaces/Automatable";



export const useAutomationLaneStore = defineStore("automation lanes", () => {
    const lanes = ref<Map<string, AutomationLane>>(new Map());
    const synth = useSynthStore();

    /** which parameter is currenly being shown on screen for automation */
    const parameterBeingAutomated = ref<SynthParam | false>(false);

    const sortPointsByTime = (lane: AutomationLane) => {
        lane.content.sort((a, b) => {
            return a.time - b.time
        });
        let prevPoint: AutomationPoint | null = null;
        lane.content.forEach((point, i) => {
            if (prevPoint) {
                prevPoint.next = point;
            }
            point.prev = prevPoint;
            prevPoint = point;
        });

        lane.sizeWhenLastSorted = lane.content.length;
    }
    watchEffect(() => {
        lanes.value.forEach((lane) => {
            if (lane.content.length !== lane.sizeWhenLastSorted) {
                sortPointsByTime(lane);
            }
        });
    })

    const addAutomationLane = (targetParameter?: AutomatableSynthParam, automationPoints: AutomationPoint[] = []) => {
        const newLane = automationLane({
            displayName: "New Automation Lane",
            content: [],
            targetParameter,
        });
        if (targetParameter) newLane.targetParameter = targetParameter;
        // if(typeof synth.synthParamToAccessorString !== 'function') {
        //     throw new Error('synth.synthParamToAccessorString is ' + typeof synth.synthParamToAccessorString + ' instead of function')
        // }
        const key = synth.synthParamToAccessorString(targetParameter) || 'undefined'
        lanes.value.set(key, newLane);
        newLane.content = automationPoints;
        return newLane;
    }
    const getOrCreateAutomationLaneForParameter = (targetParameter: AutomatableSynthParam) => {
        if (!isAutomatable(targetParameter)) {
            return undefined;
        }
        const paramName = synth.synthParamToAccessorString(targetParameter) || 'undefined'
        let lane = lanes.value.get(paramName)
        if (!lane) {
            lane = addAutomationLane(targetParameter);
        }
        return lane;
    }
    const isParameterAutomated = (targetParameter: SynthParam) => {
        if (!isAutomatable(targetParameter)) {
            return false;
        }
        const paramName = synth.synthParamToAccessorString(targetParameter) || 'undefined'
        let lane = lanes.value.get(paramName)
        return lane !== undefined && lane.content.length > 0;
    }
    const castToSynthParam = (targetParameter: string | SynthParam | undefined): SynthParam | undefined => {
        if (typeof targetParameter === 'string') {
            return synth.accessorStringToSynthParam(targetParameter);
        }
        return targetParameter;
    }
    const applyAutomationLaneDef = (automationLaneDef: AutomationLaneDef) => {
        let targetParameter = castToSynthParam(automationLaneDef.targetParameter);
        if(!targetParameter) {
            console.warn('could not apply automation lane def as target parameter is', targetParameter, automationLaneDef)
            return
        }
        let automatable = isAutomatable(targetParameter);
        if(!automatable){
            console.warn('could not apply automation lane def as target parameter is not automatable', targetParameter)
            return
        }
        const automationPoints = automationLaneDef.content.map(automationPoint)
        addAutomationLane(automatable, automationPoints);
    }
    const getAutomationLaneDef = (automationLane: AutomationLane): AutomationLaneDef => {
        const parameterAccessorString = synth.synthParamToAccessorString(
            automationLane.targetParameter
        );
        return {
            ...automationLaneDef(automationLane),
            targetParameter: parameterAccessorString,
        };
    }
    const getAutomationLaneDefs = () => {
        const automationLaneDefs: AutomationLaneDef[] = [];
        lanes.value.forEach((lane) => {
            if (lane.content.length) {
                automationLaneDefs.push(getAutomationLaneDef(lane));
            }
        });
        return automationLaneDefs;
    }
    const applyAutomationLaneDefs = (automationLaneDefs: AutomationLaneDef[]) => {
        automationLaneDefs.forEach(applyAutomationLaneDef);
    }
    const clear = () => {
        lanes.value.forEach((lane) => {
            lane.content.length = 0;
        });
        lanes.value.clear();
    }
    const deleteAutomationPoint = (point: AutomationPoint, lane?: AutomationLane) => {
        let containerLane: AutomationLane
        let atIndex = -1;
        if (lane === undefined) {
            const found = [...lanes.value.values()].find((l, i) => {
                atIndex = l.content.indexOf(point)
                if (atIndex !== -1) return true;
                return false;
            });
            if (!found) throw new Error('no lane contains point requested for deletion')
            containerLane = found;
        } else {
            containerLane = lane;
            atIndex = containerLane.content.indexOf(point)
        }
        if (atIndex === -1) throw new Error('could not delete point as it was not found on lane\'s content')
        containerLane.content.splice(atIndex, 1);
    }

    const forEachAutomationPoint = (callback: (ap: AutomationPoint) => void) => {
        lanes.value.forEach((lane) => {
            lane.content.forEach(callback);
        });
    }

    // if (!lanes.value.size) {
    //     const defaultLane = addAutomationLane();
    //     defaultLane.displayName = "Default";
    // }


    return {
        lanes,
        addAutomationLane,
        applyAutomationLaneDef,
        getAutomationLaneDef,
        getAutomationLaneDefs,
        applyAutomationLaneDefs,
        getOrCreateAutomationLaneForParameter,
        isParameterAutomated,
        forEachAutomationPoint,
        deleteAutomationPoint,
        clear,
    };
});