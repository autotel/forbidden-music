<script setup lang="ts">
import { f } from 'vitest/dist/index-c3f83a58';
import { onMounted, onUnmounted, ref } from 'vue';

const fEl = ref<HTMLDivElement>();
const mEl = ref<HTMLDivElement>();

onMounted(() => {
    if (!fEl.value) return;
    if (!mEl.value) return;
    const clWidthH = window.innerWidth / 2;
    const clHeightH = window.innerHeight / 2;
    
    const rect = mEl.value.getBoundingClientRect();
    const hClass = rect.left < clWidthH ? "left" : "right";
    const vClass = rect.top < clHeightH ? "top" : "bottom";
    fEl.value.className = `${vClass} ${hClass} floating-text-box`;
    
});
onUnmounted(() => {
});

</script>

<template>
    <div class="container" ref="mEl">
        <div class="floating-text-box" ref="fEl">
            <slot></slot>
        </div>
    </div>
</template>
<style>
.container {
    position: relative;
    z-index: 4;
    pointer-events: none;
    width:0;
    height:0;
}

.floating-text-box {
    position: absolute;
    display:block;
    padding: 1em;
    background-color: white;
    border:solid 1px;
    border-radius: 0.3rem;
}

.floating-text-box.bottom {
    bottom: 0;
}

.floating-text-box.top {
    top: 0;
}

.floating-text-box.right {
    right: 0;
}

.floating-text-box.left {
    left: 0;
}

</style>