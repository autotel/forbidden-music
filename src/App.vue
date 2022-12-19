<script setup lang="ts">
import { View } from './View';
import { onMounted, ref } from 'vue';
import TimeScrollBar from './components/TimeScrollBar.vue';

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
const viewRef = ref<View>(new View(1920, 1080, 1024, 3));

const changeTimeOffset = (timeOffset: number) => {
  viewRef.value.timeOffset = timeOffset;
}
const changeViewWidthTime = (viewWidthTime: number) => {
  viewRef.value.viewWidthTime = viewWidthTime;
}

onMounted(() => {
  //make the timedEventsViewport always fill the window
  const $viewPort = timedEventsViewport.value;
  if (!$viewPort) throw new Error("timedEventsViewport not found");
  const view = viewRef.value;
  view.timeOffset = 256;
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
      Math.random() * 1000,
      Math.random() * 100,
      Math.random() * 10
    ));
  }
});


</script>

<template>
  <svg ref="timedEventsViewport" style="border:solid 1px red; ">
    <!-- draw a rectangle representing each note -->
    <rect v-for="note in notes" :x="viewRef.pxToTime(note.start)" :y="viewRef.octaveToPx(note.octave)"
      :width="viewRef.pxToTime(note.duration)" :height="10" />
  </svg>
  <TimeScrollBar :view="viewRef" />
</template>

<style scoped>

</style>
