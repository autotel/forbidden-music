<script setup lang="ts">

import { ref } from "vue";
import Button from "../components/Button.vue";

const props = defineProps<{
    side?: "top" | "bottom" | "left" | "right",
    title?: string,
    startExpanded?: boolean,
    tooltip?: string,
}>();
const content = ref<HTMLElement | null>(null);
const expanded = ref(props.startExpanded ?? true);
// const measureContentHeight = () => {
//     if (content.value) {
//         content.value.style.height = "auto";
//         // content.value.style.transition = "none";
//         const height = content.value.clientHeight;
//         content.value.style.height = "0";
//         // content.value.style.transition = '';
//         return height;
//     }
//     return 0;
// }

</script>

<template>
    <Button :onClick="() => expanded = !expanded" class="full-width" :tooltip="tooltip">
        <span class="icon">
            <slot name="icon">
            </slot>
            <!-- <AnglesLeft v-if="expanded" />
            <AnglesRight v-else /> -->
            <div></div>
        </span>
    </Button>
    <div ref="content" class="content-container full-width" :class="{ expanded }">
        <slot>
        </slot>
    </div>
</template>

<style scoped>
.icon {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.content-container {
    height: 0;
    overflow: hidden;
    transition: height 0.2s;
    /* padding: 0.5em; */
    box-sizing: border-box;
    position: relative;
    margin: 0;
}

.content-container.expanded {
    height: auto;
}
</style>
