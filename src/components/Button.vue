<script setup lang="ts">

defineProps<{ 
    onClick: ((payload: MouseEvent) => void), 
    active?: boolean | undefined 
    danger?: boolean | undefined 
}>()

</script>

<template>
    <button 
        @click="onClick" 
        :class="{active, danger}"
    >
        <slot></slot>
    </button>
</template>

<style scoped>
button {
    margin: 1px 1px;
    padding: 0.3em 0.6em;
    border: none;
    cursor: pointer;
    background-color: rgb(241, 241, 241);
}
button:hover {
    background-color: rgb(214, 214, 214);

}
button.active {
    background-color: rgb(235, 210, 229);
}
button.active:hover {
    background-color: rgb(179, 161, 174);
}
button.danger:hover {
    background-color: rgb(255, 90, 49);
}
</style>
