<script setup lang="ts">
import Tooltip from './Tooltip.vue';

</script>
<template>
    <Tooltip tooltip="visit autotel.co for more details">
    <div>
        Autotel - nondiscrete piano roll
    </div>
    </Tooltip>
</template>
<style scoped>
    div {
        height: 100%;
        display: flex;
        align-items: center;
    }
    svg {
        width: 100%;
        height: 100%;
    }
</style>