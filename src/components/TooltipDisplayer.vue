<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useToolStore } from '../store/toolStore';
import { useCommunicationStore } from '../store/communicationStore';
const communications = useCommunicationStore();
const container = ref<HTMLDivElement>();
const currentShowTimeout = ref<NodeJS.Timeout | null>(null);
// TODO: this ref no longer needed as currentTooltip now can be null
const show = ref(false);

const tooltipContent = () => {
    return communications.currentTooltip?.content;
};

const dismiss = (e?: Event) => {
    if(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
    }
    show.value = false;
    communications.tooltipOff();
    document.removeEventListener('mousedown', dismiss);
    document.removeEventListener('keydown', dismiss);
}
const width = computed(() => {
    const content = tooltipContent();
    if (!content) return "auto";
    const longestWord = content.split(" ").reduce((a, b) => a.length > b.length ? a : b, "");
    return (Math.max(longestWord.length / 2, content.length / 6) + 1) + "em";
});
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

watch(() => communications.currentTooltip, () => {
    if (currentShowTimeout.value) {
        clearTimeout(currentShowTimeout.value);
    }
    if (communications.currentTooltip?.owner) {
        currentShowTimeout.value = setTimeout(() => {
            show.value = true;

            document.addEventListener('mousedown', dismiss);
            document.addEventListener('keydown', dismiss);
        }, 500);
    } else {
        dismiss();
    }
})

</script>

<template>
    <div class="container" ref="container" :class="{ hidden: !show }" :style="{ width }">
        <p>{{ tooltipContent() }}</p>
    </div>
</template>
<style scoped>
.container {
    position: fixed;
    z-index: 4;
    /* transition: 0.5s opacity; */
    pointer-events: none;
    background-color: rgba(255, 255, 255, 0.9);
    opacity: 1;
    left: 0;
    top: 0;

    padding: 0.5em 1em;
    border: solid 1px;
    border-radius: 5px;
    box-sizing: content-box;

    backdrop-filter: blur(2px);
}

.container.hidden {
    opacity: 0;
}

@media (prefers-color-scheme: dark) {
    .container {
        background-color: rgba(36, 44, 53, 0.712);
        color: #fcfafc;
    }

}
</style>