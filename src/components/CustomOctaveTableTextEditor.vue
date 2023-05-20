<script setup lang="ts">
import { onMounted, ref, watch, watchEffect } from 'vue';
import { useSnapStore } from '../store/snapStore';
import Toggle from './inputs/Toggle.vue';
import { frequencyToOctave, octaveToFrequency } from '../functions/toneConverters';

const snap = useSnapStore();
const valid = ref(false);
const octavesTableText = ref("");
const frequenciesTableText = ref("");
const errorMsg = ref("");
const frequencyMode = ref(true);

const shaveNumber = (n: number) => {
    const s = "" + n;
    if (s.length > 8) {
        return s.slice(0, 8);
    }
    return s;
}

onMounted(() => {
    if (snap.customOctavesTable.length > 40) {
        octavesTableText.value = snap.customOctavesTable.join(",\n");
    } else {
        octavesTableText.value = snap.customOctavesTable.join(", ");
    }
    // on edit octaves, update frequencies
    watchEffect(() => {
        if(!frequencyMode.value) return;
        try {
            const octaves = octavesTableText.value.split(",")
                .filter(l => l)
                .map((f) => {
                    const nn = parseFloat(f)
                    if (isNaN(nn)) {
                        throw `List includes non-number "${f}"`;
                    }
                    return nn;
                });
            snap.customOctavesTable = octaves;
            frequenciesTableText.value = octaves.map(octaveToFrequency).join(", ");
            valid.value = true;
        } catch (e: any) {
            errorMsg.value = "" + e;
            valid.value = false;
        }
    });
    // on edit frequencies, update octaves
    watchEffect(() => {
        if(frequencyMode.value) return;
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
            snap.customOctavesTable = frequencies.map(frequencyToOctave);
            octavesTableText.value = snap.customOctavesTable.join(", ");
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
        <Toggle v-model="frequencyMode" />
        <h2>Paste or write {{frequencyMode?"frequencies":"octaves"}}.</h2>
        <p>actually, I hope you are just going to paste them. Try heading to <a target="_blank"
                href="https://autotel.co/tuning-explorer/">Tuning explorer</a></p>
        <p>Use period for decimal point, and comma to separate entries</p>
        <template v-if="frequencyMode">
            <textarea v-model="frequenciesTableText" style="width: 40em; height: 44em;"></textarea>
        </template>
        <template v-else>
            <textarea v-model="octavesTableText" style="width: 40em; height: 44em;"></textarea>
        </template>
        <p v-if="!valid" style="color: red;">{{ errorMsg }}</p>
    </div>
</template>

<style scoped>
textarea.has-errors {
    border: solid 1px red;
}

textarea {
    position: static;
    display: block;
}
</style>