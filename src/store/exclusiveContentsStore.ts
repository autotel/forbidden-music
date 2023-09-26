import { defineStore } from "pinia";
import { ref } from "vue";
import { ifDev } from "../functions/isDev";
import { ifTauri } from "../functions/isTauri";

export const useExclusiveContentsStore = defineStore("exclusive contents store", () => {
    const enabled = ref(false);

    ifTauri(() => {
        console.log("tauri - exclusives mode on");
        enabled.value = true;
    });

    ifDev(() => {
        console.log("dev - exclusives mode on");
        enabled.value = true;
    });

    
    if(window.location.hash == "#exclusive") {
        enabled.value = true;
        console.log("exclusives mode on");
    }
    return {
        enabled
    }
});