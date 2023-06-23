import { defineStore } from "pinia";
import { ref } from "vue";

export const useExclusiveContentsStore = defineStore("exclusive contents store", () => {
    const enabled = ref(false);
    if(window.location.hash == "#exclusive") {
        enabled.value = true;
        console.log("exclusives mode on");
    }
    return {
        enabled
    }
});
