<script setup lang="ts">
import { ref } from 'vue'
import { Tool } from '../dataTypes/Tool';
import { useSnapStore, SnapType } from '../store/snapStore';
import { useToolStore } from '../store/toolStore';

import Button from './Button.vue';
import EdgeHidableWidget from './EdgeHidableWidget.vue';

const tool = useToolStore();
const snap = useSnapStore();
//{{ isnap.active ? '☑' : '☐' }} 
</script>

<template>
  <EdgeHidableWidget style="bottom: 2em" pulltip="open snaps">
    <Button 
      v-for="(isnap, snapName) in snap.values" 
      :onClick="() => isnap.active = !isnap.active" 
      :class="{
        active: isnap.active,
        time: isnap.type === SnapType.Time,
        tone: isnap.type === SnapType.Tone,
      }" 
      :tooltip="isnap.description"
    >
      {{ isnap.icon }}
    </Button>
  </EdgeHidableWidget>
</template>

<style scoped>
Button {
  position: relative;
  /* color: rgb(107, 107, 107); */
  /* font-weight: 600; */
}

Button:active {
  /* background-color: ""; */
  top: 4px;
}

.active {
  /* border-bottom: solid 4px;
  padding-bottom: 0; */
  text-shadow: 0 0 2px white;
}

.time {
  background-color: rgb(0, 99, 145);
}

.tone {
  background-color: rgb(187, 153, 0);
}

.time.active,
.time:hover,
.time.active:hover {
  background-color: rgb(105, 207, 255);
}

.tone.active,
.tone:hover,
.tone.active:hover {
  background-color: rgb(255, 230, 116);
}
</style>
