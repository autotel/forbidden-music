<script setup lang="ts">
import { ref } from 'vue'
import { Tool } from '../dataTypes/Tool';
import { useToolStore } from '../store/toolStore';

import Button from './Button.vue';

const tool = useToolStore();

</script>

<template>
  <Button 
    v-for="(isnap,snapName) in tool.snaps" 
    :onClick="()=>tool.snaps[snapName] = !tool.snaps[snapName]"
    :class="{active: tool.snaps[snapName]}"
  >
    {{ snapName }}
  </Button>  
</template>

<style scoped>
.active {
  background-color: #888;
  /* color: rgb(196, 0, 0); */
}
</style>
