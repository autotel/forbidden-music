<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import Button from '../components/Button.vue';
import Toggle from '../components/inputs/Toggle.vue';
import { octaveToFrequency, frequencyToOctave } from '../functions/toneConverters';
import { useSelectStore } from '../store/selectStore';
import { useCustomOctavesTableStore } from '@/store/customOctavesTableStore';

const customOctaves = useCustomOctavesTableStore();
const select = useSelectStore();

const tableText = ref("");
const errorMsg = ref("");
const valid = ref(true);

// Helper to parse input string to number array
function parseInput(str: string): number[] {
    return str.split(/[,\s]+/)
        .filter(s => s.length > 0)
        .map(s => {
            const n = parseFloat(s);
            if (isNaN(n)) throw new Error(`List includes non-number "${s}"`);
            return n;
        });
}

// Update textarea from store
function updateTableTextFromStore() {
    if (customOctaves.frequenciesMode) {
        // Show frequencies
        tableText.value = customOctaves.setFrequencies.join(", ");
    } else {
        // Show octaves
        tableText.value = customOctaves.setOctaves.join(", ");
    }
    console.log('tableText after update:', tableText.value);
}

// Handle textarea input
function onTableTextInput() {
    try {
        const arr = parseInput(tableText.value);
        customOctaves.setCurrent(arr);
        errorMsg.value = "";
        valid.value = true;
    } catch (e: any) {
        errorMsg.value = e.message || String(e);
        valid.value = false;
    }
}

// Handle mode toggle
watch(()=>customOctaves.frequenciesMode, () => {
    // Value already toggled
    if (customOctaves.frequenciesMode) {
        customOctaves.setFrequencies = customOctaves.setOctaves.map(n=>octaveToFrequency(n))
        console.log(customOctaves.setOctaves, customOctaves.setFrequencies)
    } else {
        customOctaves.setOctaves = customOctaves.setFrequencies.map(n=>frequencyToOctave(n))
        console.log(customOctaves.setFrequencies, customOctaves.setOctaves)
    }
    updateTableTextFromStore();
})

// Set from selected notes
function setFromSelectedNotes() {
    const selected = select.getNotes();
    const arrayUnique = (arr: any[]) => arr.filter((v, i, self) => self.indexOf(v) === i);
    const octaves = arrayUnique(selected.map(n => n.octave));
    if (customOctaves.frequenciesMode) {
        // Set as frequencies
        const frequencies = octaves.map(n=>octaveToFrequency(n));
        customOctaves.setCurrent(frequencies);
    } else {
        customOctaves.setCurrent(octaves);
    }
    updateTableTextFromStore();
}

// Watch for mode changes
watch(() => customOctaves.frequenciesMode, () => {
    updateTableTextFromStore();
});

onMounted(() => {
    updateTableTextFromStore();
});
</script>

<template>
    <div>
        <h2>Paste or write {{ customOctaves.frequenciesMode ? "frequencies" : "octaves" }}.</h2>
        <p class="line">actually, I hope you are just going to paste them. Try heading to <a target="_blank"
                href="https://autotel.co/tuning-explorer/">Tuning explorer</a></p>
        <p class="line">Or <Button :onClick="setFromSelectedNotes">set from selected notes</Button></p>
        <span class="line">
            <Toggle v-model="customOctaves.frequenciesMode" style="display:inline" />&nbsp;&Tab;Switch to
            {{ customOctaves.frequenciesMode ? 'octaves' : 'frequencies' }} (precision might be lost on each toggle)
        </span>
        <p class="line">Use period for decimal point, and comma or whitespace to separate entries</p>
        <textarea :class="{ 'has-errors': !valid }" v-model="tableText" @input="onTableTextInput"
            style="width: 100%; height: 40em;"></textarea>
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

.line {
    margin: 1em 0;
}
</style>