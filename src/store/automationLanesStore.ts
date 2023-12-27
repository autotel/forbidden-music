import { defineStore } from "pinia";
import { ref, watchEffect } from "vue";
import { AutomationLane, AutomationLaneDef, automationLane, automationLaneDef } from "../dataTypes/AutomationLane";
import { SynthParam } from "../synth/SynthInterface";
import { usePlaybackStore } from "./playbackStore";

export const useAutomationLaneStore = defineStore("automation lanes", () => {
    const playback = usePlaybackStore();
    const lanes = ref<Map<number, AutomationLane>>(new Map());

    /** which parameter is currenly being shown on screen for automation */
    const parameterBeingAutomated = ref<SynthParam | false>(false);
    const getUnusedMapKey = () => {
        let i = 0;
        while (lanes.value.has(i)) {
            i++;
        }
        return i;
    }

    const sortPointsByTime = (lane: AutomationLane) => {
        lane.content.sort((a, b) => a.time - b.time);
        lane.sizeWhenLastSorted = lane.content.length;
    }

    watchEffect(() => {
        lanes.value.forEach((lane) => {
            if (lane.content.length !== lane.sizeWhenLastSorted) {
                sortPointsByTime(lane);
            }
        });
    })


    const addAutomationLane = (targetParameter?: SynthParam) => {
        const newLane = automationLane({
            displayName: "New Automation Lane",
            content: [],
            targetParameter,
        });
        if (targetParameter) newLane.targetParameter = targetParameter;
        lanes.value.set(getUnusedMapKey(), newLane);
        return newLane;
    }
    const getOrCreateAutomationLaneForParameter = (targetParameter: SynthParam) => {
        const lanesArray = Array.from(lanes.value.values());
        let lane = lanesArray.find((lane) => lane.targetParameter === targetParameter);
        if (!lane) {
            lane = addAutomationLane(targetParameter);
        }
        return lane;
    }
    const applyAutomationLaneDef = (automationLaneDef: AutomationLaneDef) => {
        let targetParameter = automationLaneDef.targetParameter;
        if (typeof targetParameter === "string") {
            targetParameter = playback.accessorStringToSynthParam(targetParameter);
        }
        addAutomationLane(targetParameter);
    }
    const getAutomationLaneDef = (automationLane: AutomationLane): AutomationLaneDef => {
        const parameterAccessorString = playback.synthParamToAccessorString(
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
            automationLaneDefs.push(getAutomationLaneDef(lane));
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
    if (!lanes.value.size) {
        const defaultLane = addAutomationLane();
        defaultLane.displayName = "Default";
    }

    return {
        lanes,
        addAutomationLane,
        applyAutomationLaneDef,
        getAutomationLaneDef,
        getAutomationLaneDefs,
        applyAutomationLaneDefs,
        getOrCreateAutomationLaneForParameter,
        clear,
    };
});