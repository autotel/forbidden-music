<script setup lang="ts">

import { ref } from "vue";
import Button from "./Button.vue";
import Lock from "./icons/Lock.vue";
import LockOpen from "./icons/LockOpen.vue";
import AnglesLeft from "./icons/AnglesLeft.vue";
const props = defineProps<{
    pulltip?: string,
    side?: "top" | "bottom" | "left" | "right",
    title?: string,
}>();
const hovered = ref(false);
const keepOn = ref(false);
</script>

<template>
    <div class="drawer-container" @mouseenter="hovered = true" @mouseleave="hovered = false" :class="{ hide: !keepOn && !hovered }">
        <slot>

        </slot>
        <Button :onClick="() => keepOn = !keepOn" tooltip="keep open">
            <span class="icon">
                <template v-if="hovered || keepOn">
                    <Lock v-if="keepOn" />
                    <LockOpen v-else />
                </template>
                <template v-else>
                    <slot name="icon">
                        <AnglesLeft />
                    </slot>
                </template>
            </span>

        </Button>
    </div>
</template>
<style scoped>
.icon {
    font-size: 1.5em;
    text-align: center;
    fill: rgb(218, 62, 0);
}


.drawer-container {
    position: relative;
    right: 0;
    margin-right: 2em;
    width: 300px;
    transition: right 0.03s;
    background-color: rgba(255, 255, 255, 0.884);
}

.drawer-container.hide Button {
    left: 0;
    transition: left 0.03s;
}

.drawer-container Button {
    position: absolute;
    right: -2em;
    top: 0;
    height: 100%;
    transition: left 0.03s;
    width: 2em;
}

.drawer-container.hide {
    right: -300px;
}
</style>
