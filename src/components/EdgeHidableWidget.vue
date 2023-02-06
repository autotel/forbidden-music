<script setup lang="ts">

import { ref } from "vue";
import Button from "./Button.vue";
const props = defineProps<{
    pulltip?: string,
    side?: "top" | "bottom" | "left" | "right",
    title?: string,
}>();
const hovered = ref(false);
const keepOn = ref(false);
</script>

<template>
    <div @mouseenter="hovered = true" @mouseleave="hovered = false"
        :class="{ hide: !keepOn && !hovered }">
        <Button :onClick="() => keepOn = !keepOn" tooltip="keep open">
            {{ keepOn? '🔒': '🔓' }}
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
    background-color: rgba(255, 255, 255, 0.884);
}

div.hide Button {
    left: -2em;
}

div Button {
    position: absolute;
    left: -2em;
    top: 0;
    height: 100%;
    transition: left 0.3s;
    width: 2em;
}

div.hide {
    right: -300px;
}
</style>
