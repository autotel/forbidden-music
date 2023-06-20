<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const fEl = ref<HTMLDivElement>();
const mEl = ref<HTMLDivElement>();
const followMouse = false;
let corner: "tl" | "tr" | "bl" | "br" = "tl";

const mmm = (e: MouseEvent) => {
    if (!fEl.value) return;
    if (!mEl.value) return;

    const rect = mEl.value.getBoundingClientRect();
    
    if(corner[1] == 'l'){
        fEl.value.style.left = e.offsetX + "px";
    }else{
        fEl.value.style.right = rect.width - e.offsetX + "px";
    }
    if(corner[0] == 't'){
        fEl.value.style.top = e.offsetY + "px";
    }else{
        fEl.value.style.bottom = rect.height - e.offsetY + "px";
    }
    
}

onMounted(() => {
    if (!fEl.value) return;
    if (!mEl.value) return;

    const clWidthH = window.innerWidth / 2;
    const clHeightH = window.innerHeight / 2;

    const rect = mEl.value.getBoundingClientRect();
    const hClass = rect.left < clWidthH ? "left" : "right";
    const vClass = rect.top < clHeightH ? "top" : "bottom";

    if (vClass == "top" && hClass == "left") {
        corner = "tl";
    } else if (vClass == "top" && hClass == "right") {
        corner = "tr";
    } else if (vClass == "bottom" && hClass == "left") {
        corner = "bl";
    } else if (vClass == "bottom" && hClass == "right") {
        corner = "br";
    }


    if (followMouse) {
        mEl.value.style.position = "absolute";
        mEl.value.style.left = "0";
        mEl.value.style.top = "0";
        mEl.value.style.width = "100%";
        mEl.value.style.height = "100%";
        // mEl.value.style.backgroundColor = "red";

        mEl.value.addEventListener('mousemove', mmm);
        mEl.value.addEventListener('mouseenter', mmm);
    }

    fEl.value.className = `${vClass} ${hClass} floating-text-box`;
    mEl.value.style.opacity = "0.8";

});


onUnmounted(() => {
    if (!fEl.value) return;
    if (!mEl.value) return;
    fEl.value.style.opacity = "0";
    if (followMouse) {
        mEl.value.removeEventListener('mousemove', mmm);
        mEl.value.removeEventListener('mouseenter', mmm);
    }
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
    width: 0;
    height: 0;
    opacity: 0;
    transition: 0.5s opacity;
}

.floating-text-box {
    pointer-events: none;
    position: absolute;
    display: block;
    padding: 1em;
    background-color: white;
    border: solid 1px;
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