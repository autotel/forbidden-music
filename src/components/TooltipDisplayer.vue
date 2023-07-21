<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue';
import { useToolStore } from '../store/toolStore';
const tool = useToolStore();
const container = ref<HTMLDivElement>();
const currentShowTimeout = ref<NodeJS.Timeout | null>(null);
const show = ref(false);

const followMouse = true;

const mousepos = (e: MouseEvent) => {

    if (!container.value) return;

    const rect = container.value.getBoundingClientRect();
    const left = e.clientX < window.innerWidth / 2;
    const top = e.clientY < window.innerHeight / 2;

    if (left) {
        container.value.style.left = e.clientX + "px";
    } else {
        container.value.style.left = e.clientX - rect.width + "px";
    }
    if (top) {
        container.value.style.top = e.clientY + "px";
    } else {
        container.value.style.top = e.clientY - rect.height + "px";
    }

}

onMounted(() => {
    if (!container.value) throw new Error("Container not found");

    const clWidthH = window.innerWidth / 2;
    const clHeightH = window.innerHeight / 2;



    if (followMouse) {
        document.addEventListener('mousemove', mousepos);
        document.addEventListener('mouseenter', mousepos);
    }

});


onBeforeUnmount(() => {
    if (!container.value) return;
    if (followMouse) {
        document.removeEventListener('mousemove', mousepos);
        document.removeEventListener('mouseenter', mousepos);
    }
});

watch(() => tool.tooltipOwner, () => {
    if (currentShowTimeout.value) {
        clearTimeout(currentShowTimeout.value);
    }
    if (tool.tooltipOwner) {
        currentShowTimeout.value = setTimeout(() => {
            show.value = true;
        }, 500);
    } else {
        show.value = false;
    }
})

</script>

<template>
    <div class="container" ref="container" :class="{ hidden: !show }">
        {{ tool.tooltip }}
    </div>
</template>
<style>
.container {
    position: fixed;
    z-index: 4;
    /* transition: 0.5s opacity; */
    pointer-events: none;
    background-color: rgba(255, 255, 255, 0.9);
    opacity: 1;
    left: 0;
    top: 0;

    padding:  0.5em 1em;
    border: solid 1px;
    border-radius: 5px;
}

.container.hidden {
    opacity: 0;
}
</style>