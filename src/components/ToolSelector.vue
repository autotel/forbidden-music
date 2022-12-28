<script setup lang="ts">
import { ref } from 'vue'
import { Tool, toolCasesArray } from '../dataTypes/Tool';
import { useToolStore } from '../store/toolStore';

import Button from './Button.vue';

const tool = useToolStore();

// :onClick="()=>tool.current = Tool[toolCase] as Tool" 
//     :active="tool.current == Tool[toolCase]"
</script>

<template>
  <Button 
    v-for="(value, k) in toolCasesArray()"
    :onClick="()=>tool.current = value.tool"
    :active="tool.current == value.tool"
  >
    {{ value.name }}
  </Button>

  <Button
    v-if="tool.current == Tool.Edit"
    :active="tool.copyOnDrag"
    :onClick="()=>tool.copyOnDrag = !tool.copyOnDrag"
  >
    Copy
  </Button>

</template>

<style scoped>
.selected {
  background-color: #888;
  /* color: rgb(196, 0, 0); */
}
</style>
