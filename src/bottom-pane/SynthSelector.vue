<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from '@/components/Button.vue';
import { useSynthStore } from '@/store/synthStore';
import { SynthConstructorWrapper } from '@/synth/getSynthConstructors';

const synth = useSynthStore();
const filterinput = ref<HTMLInputElement>();
defineEmits<{
    (e: 'select', scw: SynthConstructorWrapper): void
}>();
const searchString = ref('');
const searchResults = computed<SynthConstructorWrapper[]>(() => {
    return synth.synthConstructorWrappers.filter(scw => scw.name.toLowerCase().includes(searchString.value.toLowerCase()));
});
onMounted(() => {
    filterinput.value?.focus();
});
const showTabHint = computed(() => searchString.value.length && filterinput.value === document.activeElement);

</script>
<template>
    <h3 class="padded">Synth select</h3>
    <input ref="filterinput" v-model="searchString" placeholder="Find" class="padded"
        style="width:calc(100% - 2em); padding: 0.3em;" />
    <div class="tab-hint" v-if="showTabHint">
        <p>Press tab to select</p>
    </div>
    <template v-for="(scw, no) in searchResults">
        <Button :onClick="() => $emit('select', scw)"
            style="width:calc(100% - 2em); display:flex; justify-content: space-between;" class="padded">
            {{ scw.name }}
        </Button>
    </template>
</template>
<style scoped>
.tab-hint {
    position: relative;
    text-align: right;
}

.tab-hint p {
    border-radius: 0.3em;
    opacity: 0.7;
    right: 0;
    display: inline-block;
    font-size: 0.8em;
}
</style>
