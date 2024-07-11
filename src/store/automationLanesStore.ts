import { defineStore } from "pinia";
import { ref, watchEffect } from "vue";
import { AutomationLane, AutomationLaneDef, automationLane } from "../dataTypes/AutomationLane";
import { AutomationPoint, automationPoint } from "../dataTypes/AutomationPoint";
import { PatcheableTrait, PatcheableType } from "../dataTypes/PatcheableTrait";
import { filterMap } from "../functions/filterMap";
import { AudioModule } from "../synth/types/AudioModule";
import { AutomatableSynthParam, isAutomatable } from "../synth/types/Automatable";
import { SynthParam, isValidParam } from "../synth/types/SynthParam";
import { useSynthStore } from "./synthStore";
import { PATCHING_MAX_DEPTH } from "../consts/PatchingMaxDepth";

export const useAutomationLaneStore = defineStore("automation lanes", () => {
    // TODO: reference to synthparam is twice: once as map key, and another as prop of AutomationLane
    const lanes = ref<Map<SynthParam, AutomationLane>>(new Map());
    const synth = useSynthStore();

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
                console.log("sort autom.points", lane.displayName);
                sortPointsByTime(lane);
            }
        });
    })

    const addAutomationLane = (targetParameter: AutomatableSynthParam, automationPoints: AutomationPoint[] = []) => {
        const exists = lanes.value.get(targetParameter);
        if (exists) {
            throw new Error('automation lane already exists for this parameter. Use getOrCreate instead')
        }
        const newLane = automationLane({
            displayName: "New Automation Lane",
            content: [],
            targetParameter,
        });
        if (targetParameter) newLane.targetParameter = targetParameter;
        lanes.value.set(targetParameter, newLane);
        newLane.content = automationPoints;
        return newLane;
    }

    const getOrCreateAutomationLaneForParameter = (targetParameter: AutomatableSynthParam) => {
        if (!isAutomatable(targetParameter)) {
            return undefined;
        }
        let lane = lanes.value.get(targetParameter)
        if (!lane) {
            lane = addAutomationLane(
                targetParameter
            );
        }
        if (lane.content.length === 0) {
            // ugly patch for playback only taking into account from the second point on.
            const range = targetParameter.max - targetParameter.min;
            const firstPointValue = (targetParameter.value - targetParameter.min) / range;
            const at = automationPoint({
                time: 0,
                value: firstPointValue,
                layer: 0,
            })
            lane.content.push(
                at, at
            )
        }
        return lane;
    }

    const isParameterAutomated = (targetParameter: SynthParam) => {
        let lane = lanes.value.get(targetParameter)
        return lane !== undefined && lane.content.length > 0;
    }

    const castToSynthParam = (targetParameter: string | SynthParam | undefined): SynthParam | undefined => {
        if (typeof targetParameter === 'string') {
            console.group('castToSynthParam');
            const result = synth.accessorStringToSynthParam(targetParameter);
            console.groupEnd();
            return result;
        }
        if (isValidParam(targetParameter)) {
            return targetParameter;
        }
        console.warn('could not cast to synth param', targetParameter);
        return undefined;
    }

    const applyAutomationLaneDef = (automationLaneDef: AutomationLaneDef) => {
        console.log("applyLaneDef", automationLaneDef);
        let targetParameter = castToSynthParam(automationLaneDef.targetParameter);
        if (!targetParameter) {
            console.warn('could not apply automation lane def as target parameter is', targetParameter, automationLaneDef)
            return
        }
        let automatable = isAutomatable(targetParameter);
        if (!automatable) {
            console.warn('could not apply automation lane def as target parameter is not automatable', targetParameter)
            return
        }
        const automationPoints = automationLaneDef.content.map(automationPoint)

        let existingAutomationLane = lanes.value.get(targetParameter);

        if (existingAutomationLane) {
            // this branch will happen on undo/redo, reopening the same project
            existingAutomationLane.content = automationPoints;
            return existingAutomationLane;
        } else {
            // this branch will happen on opening a new project
            addAutomationLane(automatable, automationPoints);
        }
    }

    const getValueBetweenTwoPoints = (a: AutomationPoint, b: AutomationPoint, time: number) => {
        if (time < a.time) throw new Error('time is before the first point');
        if (time > b.time) throw new Error('time is after the second point');

        const vRange = b.value - a.value;
        const timeRange = b.time - a.time;
        const timeOffset = time - a.time;
        return a.value + timeOffset / timeRange * vRange;
    }
    const getAutomationLaneDefs = () => {
        const automationLaneDefs: AutomationLaneDef[] = [];
        const recurse = (chainStep: PatcheableTrait, accessorString: string, titleString: string, recursion = 0) => {
            if (recursion > PATCHING_MAX_DEPTH) throw new Error('recursion depth exceeded')
            if (chainStep.children) {
                chainStep.children.forEach((child, index) => {
                    const addAccessor = accessorString ? ('.' + index) : index;
                    const addTitle = titleString ? ('/' + child.name) : child.name;
                    return recurse(child, accessorString + addAccessor, titleString + addTitle, recursion + 1);
                });
            } else if (chainStep.patcheableType === PatcheableType.AudioModule) {
                const stepIsAudioModule = chainStep as AudioModule;
                stepIsAudioModule.params.forEach((param) => {
                    const existingLane = lanes.value.get(param);
                    if (existingLane) {
                        automationLaneDefs.push({
                            displayName: titleString + '/' + param.displayName,
                            targetParameter: accessorString + '.' + param.displayName,
                            content: existingLane.content.map((point) => {
                                return {
                                    time: point.time,
                                    value: point.value,
                                    layer: point.layer,
                                }
                            })
                        });
                    }
                });
            }

        }
        recurse(synth.channels, '', '');
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


    /** 
     * Get the automation points corresponding to the given playback frame timerange
     */
    const getAutomationsForTime = (frameStartTime: number, frameEndTime: number, catchUp = false): FilteredAutomations => {
        /* 
          The return of this function is a bit counterintuitive:
          it returns the automation that follows whichever automation falls within the given range (fig 1.)
          and if catch-up is set to true, it also retuns the last automation before the range end
          
          This is because we want to animate towards the following automation, but we want to get only the 
          next automation on the first frame after the previous animation ended (fig 2) 
          so that we don't schedule destinations redundantly.
          
          fig 1:
          ----a--------a---------------a-------a--------
                       |               |       
                    in this moment     |
                                      return this one
                     
          
          fig 2:
          ----a--------a--------a-------a--------
                           |       
                     in this moment, return nothing (unless catch-up)
        */
        const returnValue:FilteredAutomations = new Map();

        for(let lane of lanes.value.values()) {
            if (!lane.content.length) continue;

            const filteredContents:AutomationPoint[] = [];
            returnValue.set(lane, filteredContents);

            const selectedIndexes = filterMap(lane.content, (point, index) => {
                if (point.time >= frameStartTime && point.time < frameEndTime) {
                    return index + 1;
                }
                return false;
            })
            if (catchUp) {
                const prevPointIndex = selectedIndexes[0] - 1;
                if (prevPointIndex >= 0) {
                    selectedIndexes.unshift(prevPointIndex);
                }
            }

            filteredContents.push(...filterMap(selectedIndexes, (index) => {
                const point = lane.content[index];
                if (!point) return false;
                return point;
            }))
        }
        return returnValue;
    }
    /**
     * 
     * Get automation lanes around a score time; in other words; the last point before the given time,
     * and the first point after the given time.
     * 
     *--------a------x------------a--a--------
     *        |      |            |       
     *        |  for this moment  |
     *        |                   |
     *        -----return these ---
     * 
     *--------a------a------------a--a--------
     *               |                   
     *           for this moment,
     *           return it
     *                            
     *         
     * 
     **/
    const getAutomationsAroundTime = (time: number, fromLanes: AutomationLane[] = [...lanes.value.values()]): FilteredAutomations => {
        return getAutomationsAroundTime_static(time, fromLanes);
    }

    return {
        lanes,
        addAutomationLane,
        applyAutomationLaneDef,
        getAutomationLaneDefs,
        applyAutomationLaneDefs,
        getOrCreateAutomationLaneForParameter,
        isParameterAutomated,
        forEachAutomationPoint,
        deleteAutomationPoint,
        getValueBetweenTwoPoints,
        getAutomationsForTime,
        getAutomationsAroundTime,
        clear,
    };
});

type FilteredAutomations = Map<AutomationLane, AutomationPoint[]>;

const getAutomationsAroundTime_static = (
    time: number,
    fromLanes: AutomationLane[]
): FilteredAutomations => {
    console.time('__version_2');
    let returnValue: FilteredAutomations = new Map();
    const lanesValue = fromLanes;
    lanesIteration: for (let lane of lanesValue) {
        const param = lane.targetParameter;
        if (!param) continue;
        if (!lane.content.length) continue;
        const contents = lane.content;
        const contentsResult: AutomationPoint[] = [];
        returnValue.set(lane, contentsResult);

        let prevPoint: AutomationPoint | undefined = undefined;
        pointsIteration: for (let i = 0; i < contents.length; i++) {
            const point = contents[i];
            if (point.time < time) {
                prevPoint = point;
            } else {
                if (point.time === time) {
                    contentsResult.push(point);
                    break pointsIteration;
                } else {
                    if (prevPoint) {
                        contentsResult.push(prevPoint);
                    }
                    contentsResult.push(point);
                    break pointsIteration;
                }
                break pointsIteration;
            }
        }

    }
    console.timeEnd('__version_2');
    return returnValue;
}

