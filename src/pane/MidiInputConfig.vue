<script setup lang="ts">
import { ref, watch } from 'vue';
import Collapsible from './Collapsible.vue';

import { usePlaybackStore } from '../store/playbackStore';
import Link from "../components/icons/Link.vue";

const playback = usePlaybackStore();
</script>

<template>
  <Collapsible tooltip="Link to a midi device to allow this device to control the transport">
    <template v-slot:icon>
      <Link clas="icon"/>
      Midi Sync
    </template>
    <div>
      <select v-model="playback.currentMidiInput">
        <option :value="null">none</option>
        <option v-for="(input, k) in playback.midiInputs" :value="input">{{ input.displayName }}</option>
      </select>
      <select v-model="playback.currentMidiConnectionMode">
        <option :value="null">none</option>
        <option v-for="(mode, k) in playback.midiConectionModes" :value="mode">{{ mode.name }}</option>
      </select>
      <div v-if="playback.currentMidiConnectionMode">
        <ul>
          <li v-for="note in playback.currentMidiConnectionMode.notes" :key="note">
            - {{ note }}  
          </li>
        </ul>
      </div>
    </div>
  </Collapsible>
</template>

<style scoped>
ul {
  margin-top: 1em;
}
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
