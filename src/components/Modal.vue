<script setup lang="ts">
defineProps<{
    onClickOutside: () => void
}>()

const stopPP = (e: Event) => {
    e.stopPropagation()
    e.stopImmediatePropagation()
}

</script>
<template v-if="modalText">
    <div 
        class="click-outside-catcher" 
        ref="clickOutsideCatcher" 
        @click="(e) =>{ stopPP(e); onClickOutside()}"
        ></div>
    <div class="modal-text-display">
        <slot></slot>
    </div>
</template>
<style scoped>
.click-outside-catcher {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    /* background-color: rgba(0, 0, 0, 0.5); */
    z-index: 9;

    filter: blur(1px);
}

.modal-text-display {
    position: fixed;

    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    background-color: white;
    padding: 1em;

    max-height: 90vh;
    max-width: 90vw;
    overflow: auto;

    display: flex;
    flex-direction: column;
    flex-wrap: wrap;

    box-shadow: 1em 1em 1em rgba(0, 0, 0, 0.5);
    z-index: 10;

}

.modal-text-display pre {
    overflow: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.modal-text-display Button {
    position: absolute;
    bottom: 1em;
    right: 1em;
}
</style>