<script setup lang="ts">

import Button from '@/components/Button.vue';
import { SampleType } from '@/dataTypes/SampleKitDefinition';
import externalSampleLibrariesStore from '@/store/externalSampleLibrariesStore';
import { ConvolutionReverbEffect } from '@/synth/effects/ConvolutionReverbEffect';
import { SampleDefinition } from '@/synth/features/sampleUser';
import { computed, ref } from 'vue';



const props = defineProps<{
    audioModule: ConvolutionReverbEffect,
    types?: SampleType[],
}>();

const expanded = ref(true);
const externalSamplesStore = externalSampleLibrariesStore();
const filterWord = ref('');

const typeFilteredOptions = computed(() => {
    const libs = externalSamplesStore.listOfAvailableSampleKits;
    console.log('for types', props.types, libs);

    // samples whose parent kits match the filter criteria
    let result = externalSamplesStore.listOfAvailableSampleKits.filter(kit => {
        if (props.types && props.types.length > 0) {
            return props.types?.includes(kit.type);
        }
        return true;
    }).map(kit => 
        // make it a list of samples instead of kits
        kit.samples.map(s =>
            // and get kit's loadFrom prop from kit
            ({ loadFrom: kit.loadFrom, ...s })
        )
    ).flat();
    return result;
});

const filteredOptions = computed(() => {
    let result = typeFilteredOptions.value;
    if (filterWord.value === '') return result;
    return result.filter(option => {
        return option.name.toLowerCase().includes(filterWord.value.toLowerCase())
    });
});

await props.audioModule.waitReady;

const sampleSelectOption = (option: SampleDefinition) => {
    console.log("sample selector would set", option);
    props.audioModule.sampleParam.value = option;
}

</script>
<template>
    <div class="sample-selector">
        <input v-model="filterWord" placeholder="Find" />
        <div class="sample-type-filter">
            <div class="taggy" v-for="type in types">
                {{ type }}
            </div>
        </div>
        <template v-if="expanded">
            <template v-for="option in filteredOptions">
                <Button :active="option.name === audioModule.sampleParam.value.name"
                    :onClick="() => sampleSelectOption(option)">{{ option.name }}</Button>
            </template>
        </template>
        <template v-else>
            <Button :onClick="() => expanded = true">{{ audioModule.sampleParam.value.name }}</Button>
        </template>
    </div>

</template>
<style scoped>
.sample-selector {
    /* height: 100%; */
    overflow: hidden;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding-right: 12px;
    width: 9em;
}
</style>