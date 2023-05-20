/**
 * creates a store that defines a mono target for interactions,
 * thus preventing notes from getting deleted when the user presses
 * del on a text form, or playback from starting when user presses
 * space, or zooming when scrolling on a modal, etc.
 */

import { defineStore } from "pinia";
import { ref } from "vue";




export const useMonoModeInteraction = defineStore("monoModeInteraction", () => {
    const currentModeKey = ref("default");
    const activationStack = ref([] as string[]);
    const existingKeysForDebug = [] as string[];
    const activate = (key: string) => {
        if (!existingKeysForDebug.includes(key)) {
            throw new Error(`key ${key} does not exist`);
        }
        activationStack.value.push(key);
        currentModeKey.value = key;
    }
    // create an interface to create event modals that can only be triggered
    // when said modal is active
    const createInteractionModal = (key: string) => {
        const isActive = () => { console.log(currentModeKey.value == key); return currentModeKey.value == key };
        const eventListenerRemovers = [] as (() => void)[];
        existingKeysForDebug.push(key);
        type EventListenerTarget = HTMLElement | SVGElement | Document | Window;

        const addEventListener = (
            target: EventListenerTarget,
            event: any,
            callback: (arg0: any) => void
        ) => {
            const handler = (e: any) => {
                if (currentModeKey.value == key) {
                    callback(e);
                }
            };
            target.addEventListener(event, handler);
            const rr = () => target.removeEventListener(event, handler)
            eventListenerRemovers.push(rr);
            return rr;
        }

        const removeAllEventListeners = () => {
            eventListenerRemovers.forEach((remover) => remover());
            eventListenerRemovers.length = 0;
        }

        const __activate = () => {
            activate(key);
        }
        const deactivate = () => {
            const index = activationStack.value.indexOf(key);
            if (index == -1) {
                console.warn("deactivating interaction modal that was not active");
            } else {
                activationStack.value.splice(index, 1);
                if (activationStack.value.length == 0) {
                    currentModeKey.value = "default";
                } else {
                    currentModeKey.value = activationStack.value[activationStack.value.length - 1];
                }
            }
        }
        return {
            deactivate,
            isActive,
            activate: __activate,
            addEventListener,
            removeAllEventListeners,
        };
    }

    return {
        createInteractionModal,
        activate,
        currentModeKey,
    };
});

