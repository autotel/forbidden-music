<script setup lang="ts">
import Button from '../components/Button.vue';
import { SynthConstructorWrapper, useSynthStore } from '../store/synthStore';

const synth = useSynthStore();
defineEmits<{
   (e: 'select', scw: SynthConstructorWrapper): void
}>();
</script>
<template>
    <h3 class="padded">Synth select</h3>
    <template v-for="(scw, no) in synth.synthConstructorWrappers">
        <Button :onClick="() => $emit('select', scw)"
            style="width:calc(100% - 2em); display:flex; justify-content: space-between;" class="padded">
            {{ scw.name }}
        </Button>
    </template>
</template>
