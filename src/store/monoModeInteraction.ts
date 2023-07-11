/**
 * creates a store that defines a mono target for interactions,
 * thus preventing notes from getting deleted when the user presses
 * del on a text form, or playback from starting when user presses
 * space, or zooming when scrolling on a modal, etc.
 */

import { defineStore } from "pinia";
import { onDeactivated, ref } from "vue";

type EventListenerTarget = {
    addEventListener: (event: any, callback: (arg0: any) => void) => void;
    removeEventListener: (event: any, callback: (arg0: any) => void) => void;
}

interface InteractionModal {
    activate: () => void;
    deactivate: () => void;
    isActive: () => boolean;
    addEventListener: (
        target: EventListenerTarget,
        event: any,
        callback: (arg0: any) => void
    ) => () => void;
    removeAllEventListeners: () => void;
}

/** 
 * an object containing a bunch of event listeners, which
 * are ignored unless the isActive function returns true
 */
class ModalControl implements InteractionModal {
    activate: () => void;
    deactivate: () => void;
    isActive;
    addEventListener = (
        target: EventListenerTarget,
        event: any,
        callback: (arg0: any) => void
    ) => {
        const handler = (e: any) => {
            if (this.isActive()) {
                callback(e);
            }
        };
        if (!target) throw new Error("target is " + target);
        try {
            target.addEventListener(event, handler);
            const rr = () => target.removeEventListener(event, handler)
            this.assignedEventListeners.push(rr);
            return rr;
        } catch (e) {
            console.error(`failed to add event listener ${event} to ${JSON.stringify(target)}`, e);
        }
        return () => { };
    }
    assignedEventListeners: (() => void)[] = [];
    removeAllEventListeners = () => {
        this.assignedEventListeners.forEach((remover) => remover());
        this.assignedEventListeners.length = 0;
    };
    // needs additional refactor
    constructor(
        onActivation: () => void,
        onDeactivation: () => void,
        isActive: () => boolean
    ) {
        this.isActive = () => isActive();

        this.activate = () => {
            onActivation();
        }
        this.deactivate = () => {
            onDeactivation();
        }
    }
}

export const useMonoModeInteraction = defineStore("monoModeInteraction", () => {
    const currentModeKey = ref("default");
    const activationStack = ref([] as string[]);
    const existingKeysForDebug = [] as string[];
    const interactionModals = {} as { [key: string]: ModalControl };

    const onActivation = (key: string) => {
        if (!existingKeysForDebug.includes(key)) {
            throw new Error(`key ${key} does not exist`);
        }
        activationStack.value.push(key);
        currentModeKey.value = key;
    }

    const onDeactivation = (key: string) => {
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

    // create an interface to create event modals that can only be triggered
    // if it exists, get the existing one
    // when said modal is active
    const getInteractionModal = (key: string): InteractionModal => {
        if (interactionModals[key]) {
            return interactionModals[key];
        }
        existingKeysForDebug.push(key);
        const modal = new ModalControl(
            () => onActivation(key),
            () => onDeactivation(key),
            () => currentModeKey.value == key
        );
        interactionModals[key] = modal;
        return modal;
    }

    return {
        activate(key: string) {
            getInteractionModal(key).activate();
        },
        getInteractionModal,
        currentModeKey,
    };
});

