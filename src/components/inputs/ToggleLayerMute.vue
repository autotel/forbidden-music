<script setup lang="ts">
import { Layer } from '@/store/layerStore';
import MusicNote from '../icons/MusicNote.vue';
import ButtonSub from '@/components/ButtonSub.vue'; 
import MusicNoteNot from '../icons/MusicNoteNot.vue';
const props = defineProps<{
    layerObject: Layer;
}>();
const click = (e:MouseEvent) => {
    e.stopImmediatePropagation()
    props.layerObject.mute = !props.layerObject.mute
}
</script>
<template>
    <div :class="layerObject.mute?'mute':'default'" :onClick="click" tooltip="mute layer">
        <MusicNoteNot v-if="layerObject.mute" />
        <MusicNote v-else/>
    </div>
</template>
<style scoped>
.mute {
    fill: #e50;
    color: #e50;
    background-color: transparent;
}
.default {
    /* opacity: 0.3; */
}
</style>