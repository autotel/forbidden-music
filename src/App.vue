<script setup lang="ts">
import { useViewStore } from './store/viewStore';
import { onMounted, ref } from 'vue';

import TimeScrollBar from "./components/TimeScrollBar.vue"
import { storeToRefs } from 'pinia';
class TimedEvent {
  constructor(public start: number, public duration: number) { }
}

class Note extends TimedEvent {
  constructor(start: number, duration: number, public octave: number) {
    super(start, duration);
  }
}

const timedEventsViewport = ref<SVGSVGElement>();
const notes = ref<Note[]>([]);
// const store = useViewStore();
// const view = storeToRefs(store);
const view = useViewStore();
onMounted(() => {
  //make the timedEventsViewport always fill the window
  const $viewPort = timedEventsViewport.value;
  if (!$viewPort) throw new Error("timedEventsViewport not found");
  view.timeOffset = 12;
  const resize = () => {
    console.log("resize")
    $viewPort.style.width = window.innerWidth - 2 + "px";
    $viewPort.style.height = window.innerHeight - 2 + "px";

    view.updateSize(window.innerWidth, window.innerHeight);

  };
  window.addEventListener('resize', resize);
  resize();

  // create a bunch of test notes
  for (let i = 0; i < 100; i++) {
    notes.value.push(new Note(
      Math.random() * 800,
      Math.random() * 100,
      Math.random() * 2
    ));
  }
  setInterval(() => {
    // pick a random note and randomize it's start
    const note = notes.value[Math.floor(Math.random() * notes.value.length)];
    note.start = Math.random() * 800;
    note.start = Math.random() * 100;

  }, 200);

  //log timeoffset at intervals
  setInterval(() => {
    console.log(view.timeOffset);
  }, 1000);
});


</script>

<template>
  <svg ref="timedEventsViewport" style="border:solid 1px red; ">
    <!-- draw a rectangle representing each note -->
    <rect v-for="note in notes" :x="view.pxToTime(note.start)" :y="view.octaveToPx(note.octave)"
      :width="view.pxToTime(note.duration)" :height="10" />
  </svg>
  <TimeScrollBar />
</template>

<style scoped>

</style>
