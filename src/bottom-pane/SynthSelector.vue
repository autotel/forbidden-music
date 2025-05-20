<script setup lang="ts">
import { computed, onMounted, ref, VueElement } from 'vue';
import Button from '@/components/Button.vue';
import { useSynthStore } from '@/store/synthStore';
import { AudioModuleType, SynthConstructorWrapper } from '@/synth/getSynthConstructors';
import ButtonSub from '@/components/ButtonSub.vue';
import Earthquake from '@/components/icons/Earthquake.vue';
import LensBlur from '@/components/icons/LensBlur.vue';
import Piano from '@/components/icons/Piano.vue';
import Sliders from '@/components/icons/Sliders.vue';
const synth = useSynthStore();
const filterinput = ref<HTMLInputElement>();
defineEmits<{
    (e: 'select', scw: SynthConstructorWrapper): void
}>();
const searchString = ref('');
const searchResults = computed<SynthConstructorWrapper[]>(() => {
    const searchStr = searchString.value.toLowerCase()


    return synth.synthConstructorWrappers.filter(scw => {
        return scw.name.toLowerCase().includes(searchStr);
    });
});
onMounted(() => {
    filterinput.value?.focus();
});
const showTabHint = computed(() => searchString.value.length && filterinput.value === document.activeElement);
const typeStrn = (type: AudioModuleType) => {
    console.log(type);
    switch (type) {
        case AudioModuleType.Effect: return LensBlur;
        case AudioModuleType.Sound: return Piano;
        case AudioModuleType.Scope: return Earthquake;
        default: return Sliders;
    }
}
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
            
            
                <component :is="typeStrn(scw.type)"/>
                
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
