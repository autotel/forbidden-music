<script setup lang="ts">
import { useViewStore } from './store/viewStore';
import { useScoreStore } from './store/scoreStore';
import { onMounted, ref } from 'vue';

import TimeScrollBar from "./components/TimeScrollBar.vue"
import { storeToRefs } from 'pinia';
import { Note } from './dataTypes/Note';
import NoteElement from './components/NoteElement.vue';
import ToolSelector from './components/ToolSelector.vue';
import Button from "./components/Button.vue";
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

  // concerning middle wheel dragging to pan
  let draggingView = false;
  let viewDragStartX = 0;
  let viewDragStartTime = 0;
  let viewDragStartY = 0;
  let viewDragStartOctave = 0;

  // when user drags on the viewport, add a note an extend it's duration
  $viewPort.addEventListener('mousedown', (e) => {

    if (e.button === 1) {
      e.stopPropagation();
      draggingView = true;
      viewDragStartX = e.clientX;
      viewDragStartTime = view.timeOffset;
      viewDragStartY = e.clientY;
      viewDragStartOctave = view.octaveOffset;
    } else {
      const note = {
        // TODO: it seems that these converter functions are the wrong side around or something
        start: view.timeToPxWithOffset(e.offsetX),
        duration: 1,
        octave: view.pxToOctaveOffset(e.offsetY),
      } as Note;
      score.notes.push(note);
    }
  });

  window.addEventListener('mousemove', (e) => {
    // pan view, if dragging middle wheel
    if (draggingView) {
      const deltaX = e.clientX - viewDragStartX;
      const deltaY = e.clientY - viewDragStartY;
      // oddness commented elsewhere
      view.timeOffset = viewDragStartTime - view.timeToPx(deltaX);
      view.octaveOffset = viewDragStartOctave + view.pxToOctave(deltaY);
      // prevent timeOffset from going out of bounds
      if (view.timeOffset < 0) {
        view.timeOffset = 0;
      }
      if (view.timeOffset > view.scrollBound - view.viewWidthTime) {
        view.timeOffset = view.scrollBound - view.viewWidthTime;
      }
    }
  });

  window.addEventListener('mouseup', (e) => {
    // stop panning view, if it were
    draggingView = false;
  });

  // export score
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {

      const json = JSON.stringify(score.notes);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      window.open(url);
      // save json to cookie
      document.cookie = "score=" + json;
      console.log("saved");
    } else if (e.ctrlKey && e.key === 'n') {
      // wont work
      score.notes = [];
    }
  });


  // import score from cookie
  const cookie = document.cookie;
  const scoreCookie = cookie.split(';').find(c => c.startsWith('score='));
  if (scoreCookie) {
    const json = scoreCookie.split('=')[1];
    score.notes = JSON.parse(json);
  }

})

const clear = () => {
  score.notes = [];
}
const getScopednotes = () => {
  const clampToZero = (n: number) => n < 0 ? 0 : n;
  //TODO: also filter by octave component
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
        y: view.octaveToPxOffset(note.octave),
        cut: isCut,
        note: note,
      }
    });
}
</script>

<template>
  <svg id="viewport" ref="timedEventsViewport">
    <!-- draw a rectangle representing each note -->
    <NoteElement v-for="noteRect in getScopednotes()" :noteRect="noteRect" />
  </svg>
  <TimeScrollBar />
  <div style="position: fixed;">
    <Button :onClick="clear" danger>clear</Button>
    <ToolSelector />
  </div>
</template>

<style>
svg#viewport {
  position: absolute;
  top: 0;
  left: 0;
  cursor: crosshair;
}
</style>