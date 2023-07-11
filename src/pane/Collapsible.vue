<script setup lang="ts">

import { computed, onMounted, ref, watchEffect } from "vue";
import Button from "../components/Button.vue";
import Lock from "../components/icons/Lock.vue";
import LockOpen from "../components/icons/LockOpen.vue";
import AnglesLeft from "../components/icons/AnglesLeft.vue";
import AnglesRight from "../components/icons/AnglesRight.vue";

const props = defineProps<{
    pulltip?: string,
    side?: "top" | "bottom" | "left" | "right",
    title?: string,
    startExpanded?: boolean,
}>();

const expanded = ref(props.startExpanded ?? true);

</script>

<template>
    <Button :onClick="() => expanded = !expanded" style="width:100%">
        <span class="icon">
            <slot name="icon">
            </slot>
            <AnglesLeft v-if="expanded" />
            <AnglesRight v-else />
        </span>
    </Button>
    <div class="content-container" :class="{ expanded }">
        <slot>
        </slot>
    </div>
</template>
<style scoped>
.icon {
    /* font-size: 1.5em; */
    /* text-align: center; */
    /* fill: rgb(218, 62, 0);
     */
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
    padding: 0.5em;
}
</style>
