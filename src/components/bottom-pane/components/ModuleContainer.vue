<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    title: string,
    padding?: boolean
}>();
</script>

<template>
    <div class="module-container">
        <div id="title-rotator" :class="{ sideline: true }">
            <div id="title">
                <span>
                    {{ title }}
                </span>
                <div id="icons-slot-container">
                    <slot name="icons"></slot>
                </div>
            </div>
        </div>

        <div id="slot-container" :class="{ padding }">
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
    height: 100%;
}

.padding {
    padding: 0.2em;
    margin: 0.3em;
}

.module-container {
    display: flex;
    flex-direction: row;
    height: 18em;
    padding-left: 2em;
    background-color: #92909b80;
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
    /* nowrap */
    white-space: nowrap;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 16.5em;
    height: 1em;
}

#icons-slot-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 100%;
}

.sideline {
    border-right: solid 1px #aaac;
}

#title-rotator {
    position: absolute;
    top: -1.2em;
    left: 0.05em;
    width: 1.6em;
    height: calc(100% + 0.6em);
    margin: 0.6em;
    box-sizing: border-box;
}

@media (prefers-color-scheme: light) {
    .module-container {
        background-color: #e4e4e4;
    }
}
</style>