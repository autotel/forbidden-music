<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { Tool, toolCasesArray } from '../dataTypes/Tool';
import { useToolStore } from '../store/toolStore';

import Button from './Button.vue';

const tool = useToolStore();

const toggleOctaveConstrain = () => {
  tool.constrainOctave = !tool.constrainOctave;
  if(tool.constrainTime) {
    tool.constrainTime = false;
  }
}
const toggleTimeConstrain = () => {
  tool.constrainTime = !tool.constrainTime;
  if(tool.constrainOctave) {
    tool.constrainOctave = false;
  }
}
</script>

<template>
  <Button v-for="(value, k) in toolCasesArray()" :onClick="() => tool.current = value.tool"
    :active="tool.current == value.tool">
    {{ value.name }}
  </Button>
  <div class="group">
    <label>Constrain</label>
    <Button :active="tool.constrainOctave" :onClick="toggleOctaveConstrain">
      ↕
    </Button>
    <Button :active="tool.constrainTime" :onClick="toggleTimeConstrain">
      ↔
    </Button>
  </div>

  <Button v-if="tool.current == Tool.Edit" :active="tool.copyOnDrag"
    :onClick="() => tool.copyOnDrag = !tool.copyOnDrag">
    Copy
  </Button>

</template>

<style scoped>
.selected {
  background-color: #888;
  /* color: rgb(196, 0, 0); */
}

.group {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  border: solid 1px #888;
  padding: -10px;
  margin: 10px;
}
</style>
