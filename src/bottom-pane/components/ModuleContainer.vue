<script setup lang="ts">
defineProps<{
    title: string
}>();
</script>

<template>
    <div class="module-container">
        <div id="title-rotator">
            <div id="title">{{ title }}</div>
        </div>
        <slot></slot>
    </div>
</template>
<style scoped>
.module-container {
    display: flex;
    height: 100%;
    padding: 0.3em;
    margin: 0.3em;
    background-color: #5a595e;
    border: 1px solid #aaac;
    border-radius: 1em;
    box-sizing: border-box;
    overflow: hidden;
}

#title {
    position: absolute;
    bottom: 0;
    transform-origin: left top;
    transform: translate(0,100%) rotate(-90deg);
    text-align: center;
}

#title-rotator {
    position: relative;
    width: 1em;
    height: 100%;
    margin: -0.3em;
    border-right: solid 1px #aaac;
}
</style>