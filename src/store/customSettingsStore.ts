import { defineStore } from "pinia";
import { onMounted, reactive, Ref, ref, watch, watchEffect } from "vue";
import nsLocalStorage from "../functions/nsLocalStorage";
import userCustomPerformanceSettingsKey from "./userCustomPerformanceSettingsKey";
import { useViewStore } from "./viewStore";

export enum ViewportTech {
    Pixi, Svg
}


const storedSettingsDefaults = {
    viewportTech: ViewportTech.Svg,
    showFPS: false,
    fontSize: 12,
    midiInputEnabled: false,
    performanceSettingsEnabled: true,
    physicalEnabled: false,
    octaveToTimeRatio: 2.8,
    showHarp: false,
    useKnobCapture: true,
}

export const useCustomSettingsStore = defineStore("custom settings store", () => {
    const view = useViewStore();

    const stringifySettings = (settings: { [key: string]: any }) => {
        const filteredSettings = { ...settings };
        for (const key in filteredSettings) {
            if (!(key in storedSettingsDefaults)) {
                delete filteredSettings[key];
            }
        }
        return JSON.stringify(filteredSettings);
    }

    const getFromLocalStorage = () => {
        const savedSettings = nsLocalStorage.getItem(userCustomPerformanceSettingsKey);
        try{
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                // remove keys not present in storedSettingsDefaults
                for (const key in parsed) {
                    if (!(key in storedSettingsDefaults)) {
                        delete parsed[key];
                    }
                }
                return parsed;
            }
        } catch (e) {
            console.error('error parsing user settings', e);
        }
        return {};
    }


    const returnValue: { [key: string]: any } = {
        ... Object.assign({}, storedSettingsDefaults, getFromLocalStorage()),
        deleteSettings: () => {
            nsLocalStorage.removeItem(userCustomPerformanceSettingsKey);
            Object.assign(returnValue, storedSettingsDefaults);
        }
    };

    onMounted(() => {
        // Cannot watch changes from the returnValue
        const thisStore = useCustomSettingsStore();


        watchEffect(() => {
            nsLocalStorage.setItem(userCustomPerformanceSettingsKey, stringifySettings(thisStore));
            console.log('saved user performance settings');
        });

        watch(thisStore, () => {
            console.log('user performance settings changed');
        });
        watch(thisStore, () => {
            view.setOctaveToTimeRatio(thisStore.octaveToTimeRatio);
        })
        view.setOctaveToTimeRatio(thisStore.octaveToTimeRatio);


    });



    return returnValue as typeof storedSettingsDefaults & { deleteSettings: () => void };
});