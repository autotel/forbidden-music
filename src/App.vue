<script setup lang="ts">
import { useViewStore } from './store/viewStore';
import { useScoreStore } from './store/scoreStore';
import { onMounted, ref } from 'vue';

import TimeScrollBar from "./components/TimeScrollBar.vue"
import { storeToRefs } from 'pinia';
import { Note } from './dataTypes/Note';
import NoteElement from './components/NoteElement.vue';

const timedEventsViewport = ref<SVGSVGElement>();
// const notesStore = useScoreStore();
// const notes = storeToRefs(notesStore);
const score = useScoreStore();
// const store = useViewStore();
// const view = storeToRefs(store);
const view = useViewStore();
onMounted(() => {
  //make the timedEventsViewport always fill the window
  const $viewPort = timedEventsViewport.value;
  if (!$viewPort) throw new Error("timedEventsViewport not found");

  const resize = () => {
    console.log("resize")
    $viewPort.style.width = window.innerWidth - 2 + "px";
    $viewPort.style.height = window.innerHeight - 2 + "px";

    view.updateSize(window.innerWidth, window.innerHeight);

  };
  window.addEventListener('resize', resize);
  resize();

  // create a bunch of test notes
  for (let i = 0; i < 30; i++) {
    score.notes.push({
      start: Math.random() * 1200,
      duration: Math.random() * 700,
      octave: Math.random() * 2
    });
  }

});


const getScopednotes = () => {
  const clampToZero = (n: number) => n < 0 ? 0 : n;
  return score.notes.filter(note => {
    return note.start < view.timeOffset + view.viewWidthTime &&
      note.start + note.duration > view.timeOffset;
  })
    .map(note => {
      const isCut = note.start < view.timeOffset;
      const cutWidth = isCut ? note.start - view.timeOffset : 0;

      return {
        x: clampToZero(view.pxToTimeWithOffset(note.start)),
        w: view.pxToTime(note.duration + cutWidth),
        y: view.octaveToPx(note.octave),
        cut: isCut,
        note: note,
      }
    });
}
</script>

<template>
  <svg ref="timedEventsViewport" style="border:solid 1px red; ">
    <!-- draw a rectangle representing each note -->
    <NoteElement v-for="noteRect in getScopednotes()" :noteRect="noteRect" />
  </svg>
  <TimeScrollBar />
</template>
