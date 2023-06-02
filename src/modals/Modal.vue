<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useMonoModeInteraction } from '../store/monoModeInteraction'

const props = defineProps<{
    name: string
    onClose?: () => void
}>()

const monoModeInteraction = ref(useMonoModeInteraction().createInteractionModal(props.name))

const stopPP = (e: Event) => {
    e.stopPropagation()
    e.stopImmediatePropagation()
}

const close = (e: Event) => {
    console.log('close')
    monoModeInteraction.value.deactivate()
    if (props.onClose) props.onClose()
}

const showing = computed(() => monoModeInteraction.value.isActive())

</script>
<template  >
    <div v-if="showing" class="main-modal">
        <div class="click-outside-catcher" ref="clickOutsideCatcher" @click=close></div>
        <div class="modal-text-display">
            <slot></slot>
        </div>
    </div>
</template>
<style scoped>
.click-outside-catcher {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(11, 0, 36, 0.205);
    z-index: 9;

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