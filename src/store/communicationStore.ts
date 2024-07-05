import { defineStore } from "pinia";
import { VueElement, reactive, ref } from "vue";

type AssociatedElement = HTMLElement | SVGElement;

export interface PopupButton {
    text: string;
    action: () => void;
}

export interface PopupDefinition {
    title: string;
    content: string;
    buttons: Array<PopupButton>;
}

export interface ModalDefinition {
    title: string;
    content: VueElement;
    buttons: Array<PopupButton>;
}

export interface MousePopupDefinition {
    content: string;
    // used to determine whether tooltip origin changed
    owner: AssociatedElement | null;
}

export interface TooltipDefinition {
    content: string;
    // used to determine whether tooltip origin changed
    owner: AssociatedElement | null;
}

/**
 * store for popups, modals and stuff like that
 * I first created a very complicated scheme for interactions with modals,
 * hopefully I will be able to port all that functionality here and
 * simplify it.
 */



export const useCommunicationStore = defineStore("communications", () => {
    const currentPopup = ref<PopupDefinition | null>(null);
    const currentModal = ref<ModalDefinition | null>(null);
    const currentMousePopup = ref<MousePopupDefinition | null>(null);
    const currentTooltip = ref<TooltipDefinition | null>(null);

    const mousePopup = (content: string, owner: AssociatedElement) => {
        currentMousePopup.value = {
            content, owner
        };
    }
    const mousePopupOff = () => {
        currentMousePopup.value = null;
    }
    const tooltip = (content: string, owner: AssociatedElement) => {
        currentTooltip.value = {
            content, owner
        };
    }
    const tooltipOff = () => {
        currentTooltip.value = null;
    }

    return {
        currentPopup,
        currentModal,
        currentMousePopup,
        currentTooltip,
        mousePopup, mousePopupOff,
        tooltip, tooltipOff,
    }
});