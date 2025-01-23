<script setup lang="ts">

import Button from '@/components/Button.vue';
import { SampleType, SampleKitDefinition } from '@/dataTypes/SampleKitDefinition';
import externalSampleLibrariesStore from '@/store/externalSampleLibrariesStore';
import { SampleKitUser } from '@/synth/features/chromaticSampleKitUser';
import { Synth } from '@/synth/types/Synth';
import { computed, ref } from 'vue';



const props = defineProps<{
    audioModule: Synth & SampleKitUser,
    types?: SampleType[],
}>();

const expanded = ref(true);
const externalSamplesStore = externalSampleLibrariesStore();
const filterWord = ref('');

const filteredOptions = computed(() => {
    let result = externalSamplesStore.listOfAvailableSampleKits;
    
    if (props.types && props.types.length > 0) {
        result = result.filter(option => {
            return props.types?.includes(option.type);
        });
    }

    if (filterWord.value === '') return result;
    
    return result.filter(option => {
        return option.name.toLowerCase().includes(filterWord.value.toLowerCase())
    });
});

await props.audioModule.waitReady;

const sampleSelectOption = (option: SampleKitDefinition) => {
    props.audioModule.sampleKitParam.value = option;
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
                <Button 
                    :active="option.name === audioModule.sampleKitParam.value.name"
                    :onClick="() => sampleSelectOption(option)"
                >
                    {{ option.name }}
                </Button>
            </template>
        </template>
        <template v-else>
            <Button :onClick="() => expanded = true">{{ audioModule.sampleKitParam.value.name }}</Button>
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