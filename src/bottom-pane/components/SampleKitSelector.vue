<script setup lang="ts">

import Button from '@/components/Button.vue';
import externalSampleLibrariesStore, { SampleKitDefinition } from '@/store/externalSampleLibrariesStore';
import { SampleKitUser } from '@/synth/features/chromaticSampleKitUser';
import { Synth } from '@/synth/types/Synth';

const props = defineProps<{
    audioModule: Synth & SampleKitUser
}>();

const externalSamplesStore = externalSampleLibrariesStore();
await props.audioModule.waitReady;

const sampleSelectOption = (option: SampleKitDefinition) => {
    props.audioModule.sampleKitParam.value = option;
}

</script>
<template>
    <div class="sample-selector">
        <template v-for="option in externalSamplesStore.listOfAvailableSampleKits">
            <Button :active="option.name === audioModule.sampleKitParam.value.name"
                :onClick="() => sampleSelectOption(option)">{{ option.name }}</Button>
        </template>
    </div>
</template>
<style scoped>
.sample-selector {
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding-right: 12px;
}
</style>