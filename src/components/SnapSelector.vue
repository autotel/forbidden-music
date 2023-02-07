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
    <h2>Snap control</h2>
    <Button 
      v-for="(isnap, snapName) in snap.values" 
      :onClick="() => isnap.active = !isnap.active" 
      :class="{
        active: isnap.active,
        time: isnap.type === SnapType.Time,
        tone: isnap.type === SnapType.Tone,
        toneRelation: isnap.type === SnapType.ToneRelation,
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
  /* opacity:0.5; */
}
/* 
Button:active {
} */

.active {
  /* border-bottom: solid 4px;
  padding-bottom: 0; */
  text-shadow: 0 0 2px white;
  opacity: 1;
  /* top: -4px; */
  border-bottom: solid 4px;
}
.time {
  background-color: rgb(0, 99, 145);
}

.tone {
  background-color: rgb(187, 153, 0);
}
.toneRelation {
  background-color: rgb(199, 139, 61);
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
.toneRelation.active,
.toneRelation:hover,
.toneRelation.active:hover {
  background-color: rgb(255, 195, 116);
}
</style>
