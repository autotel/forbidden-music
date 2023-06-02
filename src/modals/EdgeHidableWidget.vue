<script setup lang="ts">

import { computed, onMounted, ref, watchEffect } from "vue";
import Button from "../components/Button.vue";
import Lock from "../components/icons/Lock.vue";
import LockOpen from "../components/icons/LockOpen.vue";
import AnglesLeft from "../components/icons/AnglesLeft.vue";
const props = defineProps<{
    pulltip?: string,
    side?: "top" | "bottom" | "left" | "right",
    title?: string,
    height?: string,
}>();
const hovered = ref(false);
const keepOn = ref(false);
const sizer = ref<HTMLDivElement | null>(null);

const height = ref(props.height || "0");

onMounted(() => {
    if (height.value === "0") {
        height.value = sizer.value?.getBoundingClientRect().height + "px";
    }
});

</script>

<template>
    <div class="outer" :style="{ height: height }" @mouseenter="hovered = true" @mouseleave="hovered = false">

        <div ref="sizer" class="drawer-container" :class="{ hide: !keepOn && !hovered }">
            <slot>

            </slot>

        </div>
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

.outer {
    position: relative;

}

.drawer-container {
    position: absolute;
    right: 2em;
    /* margin-right: 2em; */
    width: 300px;
    transition: right 0.03s;
    background-color: rgba(255, 255, 255, 0.884);
}

Button {
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    transition: left 0.03s;
    width: 2em;
}

.drawer-container.hide {
    right: -300px;
}
</style>
