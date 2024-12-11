<script setup lang="ts">
import Button from '@/components/Button.vue';

defineProps<{
    label?: string,
}>();

const requestFullScreen = (event: MouseEvent) => {
    const element = document.documentElement;
    // Supports most browsers and their versions.
    // @ts-ignore
    var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullScreen;

    if (requestMethod) { // Native full screen.
        requestMethod.call(element);
    }
}

</script>
<template>
    <Button class="go-fullscreen-button" @click="requestFullScreen">
        <slot>{{ label || 'Full screen' }}</slot>
    </Button>
</template>