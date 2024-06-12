
<template>
    <div style="" class="col">
        <slot></slot>
    </div>
</template>
<style scoped>
.col {
    padding-top: 0.6em;
    height: 18em;
    width: 15em;
    overflow: auto;
    position: relative;
    flex-grow: 0;
    flex-shrink: 0;
}
</style>