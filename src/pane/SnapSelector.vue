<script setup lang="ts">
import Button from '../components/Button.vue';
import Magnet from "../components/icons/Magnet.vue";
import Pen from "../components/icons/Pen.vue";
import { SnapType, useSnapStore } from '../store/snapStore';
import Collapsible from './Collapsible.vue';

import { useMonoModeInteraction } from '../store/monoModeInteraction';
const snap = useSnapStore();
const monoModeInteraction = useMonoModeInteraction();

const frequencyTableEditButtonHandler = (e: MouseEvent) => {
  e.stopImmediatePropagation()
  monoModeInteraction.activate("octave table editor")
  snap.values.customFrequencyTable.active = true
}
</script>

<template>
  <Collapsible tooltip="Select which constraints to enforce when adding new notes. Hover each button for a small explanation">
    <template v-slot:icon>
      <Magnet clas="icon"/>
      Constraints
    </template>
    <Button v-for="(isnap, snapName) in snap.values" :onClick="() => isnap.active = !isnap.active" :class="{
      active: isnap.active,
      time: isnap.type === SnapType.Time,
      tone: isnap.type === SnapType.Tone,
      toneRelation: isnap.type === SnapType.ToneRelation,
    }" :tooltip="isnap.description">
      {{ isnap.icon }}
      <template v-if="snapName === 'customFrequencyTable'">
        <span class="sub-button" :onClick="frequencyTableEditButtonHandler">
          <Pen/>
        </span>
      </template>
    </Button>
    <Button :onClick="()=>snap.onlyWithMutednotes = !snap.onlyWithMutednotes"
      :class="{active: snap.onlyWithMutednotes}" :tooltip="snap.onlyWithMutednotes ? 'only with muted notes. Use CTRL+M to mute a note' : 'all notes'">
      Monly
    </Button>
    <Button :onClick="()=>snap.onlyWithSimultaneousNotes = !snap.onlyWithSimultaneousNotes"
      :class="{active: snap.onlyWithSimultaneousNotes}" :tooltip="snap.onlyWithSimultaneousNotes ? 'only with notes which overap in time' : 'all notes'">
      Simultaneous
    </Button>
  </Collapsible>
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

.sub-button {
  border-radius: 1em;
  height: 2em;
  background-color: rgb(212, 212, 212);
  padding: 0 0.6em;
  border: solid 1px;
}
.sub-button:hover {
  background-color: rgba(255, 255, 255, 0.425);
}
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
