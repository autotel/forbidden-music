<script setup lang="ts">

import { ref } from "vue";
import Button from "./Button.vue";
defineProps<{
    pulltip?: string
}>();

const showing = ref(false);
</script>

<template>
    <div 
        :class="{ hide: !showing }"
    >
        <Button :onClick="() => showing = !showing" :tooltip="showing?undefined:pulltip">
            {{ showing ? '▷' : '◁' }}
        </Button>
        <slot>

        </slot>
    </div>
</template>
<style scoped>

div {
    position: fixed;
    right: 0;
    width: 300px;
    transition: right 0.3s;
}
div.hide Button:hover {
    left: -2em;
}
div.hide Button {
    left: -1em;
}

div Button{
    position: absolute;
    left: -2em;
    top: 0;
    height: 100%;
    transition: left 0.3s;
}
div.hide {
    right: -300px;
}
</style>
