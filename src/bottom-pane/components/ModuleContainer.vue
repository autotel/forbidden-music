<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    title: string,
    rows?: number
}>();
const width = computed(() => {
    return ((props.rows===undefined?1:props.rows) * 4 + 1.6) + 'em';
});
</script>

<template>
    <div class="module-container">
        <div id="title-rotator">
            <div id="title">{{ title }}</div>
        </div>

        <div id="slot-container" :style="{ width }">
            <slot></slot>
        </div>
    </div>
</template>
<style scoped>
#slot-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: center;
    height: fit-content;
}

.module-container {
    display: flex;
    flex-direction: row;
    height: 18em;
    padding: 0.3em;
    margin: 0.3em;
    padding-left: 2em;
    background-color: #5a595e;
    border: 1px solid #aaac;
    border-radius: 1em;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
}

#title {
    position: absolute;
    bottom: 0.8em;
    transform-origin: left top;
    transform: translate(0, 100%) rotate(-90deg);
    text-align: center;
    /* nowrap */
    white-space: nowrap;
}

#title-rotator {
    position: absolute;
    top: -1.2em;
    left: 0;
    width: 1.6em;
    height: calc(100% + 0.6em);
    margin: 0.6em;
    border-right: solid 1px #aaac;
    box-sizing: border-box;
}

@media (prefers-color-scheme: light) {
    .module-container {
        background-color: #e4e4e4;
    }
}
</style>