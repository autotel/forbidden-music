<script setup lang="ts">
import { ref } from 'vue'
import { Tool } from '../dataTypes/Tool';
import { useToolStore } from '../store/toolStore';

import Button from './Button.vue';

const tool = useToolStore();

</script>

<template>
  <Button 
    v-for="itool in tool.list" 
    :onClick="()=>tool.current = itool as Tool" 
    :active="tool.current === itool"
  >
    {{ itool }}
  </Button>  
</template>

<style scoped>
.selected {
  background-color: #888;
  /* color: rgb(196, 0, 0); */
}
</style>
