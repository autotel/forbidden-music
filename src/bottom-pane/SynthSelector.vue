<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from '../components/Button.vue';
import { SynthConstructorWrapper, useSynthStore } from '../store/synthStore';

const synth = useSynthStore();
defineEmits<{
   (e: 'select', scw: SynthConstructorWrapper): void
}>();
const searchString = ref('');
const searchResults = computed<SynthConstructorWrapper[]>(()=>{
    return synth.synthConstructorWrappers.filter(scw => scw.name.toLowerCase().includes(searchString.value.toLowerCase()));
});



</script>
<template>
    <h3 class="padded">Synth select</h3>
    <input v-model="searchString" placeholder="Find" class="padded" style="width:calc(100% - 2em); padding: 0.3em;"/>
    <template v-for="(scw, no) in searchResults">
        <Button :onClick="() => $emit('select', scw)"
            style="width:calc(100% - 2em); display:flex; justify-content: space-between;" class="padded">
            {{ scw.name }}
        </Button>
    </template>
</template>
