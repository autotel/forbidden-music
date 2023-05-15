<script setup lang="ts">
import { onMounted, ref, watch, watchEffect } from 'vue';
import { useSnapStore } from '../store/snapStore';

const snap = useSnapStore();
const valid = ref(false);
const frequenciesTableText = ref("");
const errorMsg = ref("");

onMounted(() => {
    if (snap.customFrequenciesTable.length > 40) {
        frequenciesTableText.value = snap.customFrequenciesTable.join(",\n");
    } else {
        frequenciesTableText.value = snap.customFrequenciesTable.join(", ");
    }
    watchEffect(() => {
        try {
            const frequencies = frequenciesTableText.value.split(",")
                .filter(l => l)
                .map((f) => {
                    const nn = parseFloat(f)
                    if (isNaN(nn)) {
                        throw `List includes non-number "${f}"`;
                    }
                    return nn;
                });
            snap.customFrequenciesTable = frequencies;
            valid.value = true;
        } catch (e: any) {
            errorMsg.value = "" + e;
            valid.value = false;
        }
    });

});

</script>

<template>
    <div>
        <h2>Paste or write frequencies.</h2>
        <p>actually, I hope you are just going to paste them</p>
        <p>Use period for decimal point, and comma to separate frequencies</p>  
        <textarea v-model="frequenciesTableText" style="width: 40em; height: 44em;"></textarea>
        <p v-if="!valid" style="color: red;">{{ errorMsg }}</p>
    </div>
</template>

<style scoped>
textarea.has-errors {
    border: solid 1px red;
}
textarea {
    position: static;
    display:block;
}
</style>