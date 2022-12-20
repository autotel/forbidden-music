<script setup lang="ts">
import { useViewStore } from './store/viewStore';
import { useScoreStore } from './store/scoreStore';
import { onMounted, Ref, ref } from 'vue';

import { usePlaybackStore } from './store/playbackStore';
import TimeScrollBar from "./components/TimeScrollBar.vue"
import { storeToRefs } from 'pinia';
import { Note } from './dataTypes/Note';
import NoteElement from './components/NoteElement.vue';
import ToolSelector from './components/ToolSelector.vue';
import Button from "./components/Button.vue";
import Transport from './components/Transport.vue';
const timedEventsViewport = ref<SVGSVGElement>();
// const notesStore = useScoreStore();
// const notes = storeToRefs(notesStore);
const score = useScoreStore();
// const store = useViewStore();
// const view = storeToRefs(store);
const view = useViewStore();
const playback = usePlaybackStore();

let noteBeingCreated: Ref<Note | false> = ref(false);

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

  let newNoteDragX = 0;

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
      newNoteDragX = e.offsetX;
      noteBeingCreated.value = {
        // TODO: it seems that these converter functions are the wrong side around or something
        start: view.timeToPxWithOffset(e.offsetX),
        duration: 1,
        octave: view.pxToOctaveOffset(e.offsetY),
      } as Note;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (noteBeingCreated.value) {
      const deltaX = e.clientX - newNoteDragX;
      noteBeingCreated.value.duration = clampToZero(view.pxToTime(deltaX));
    } else if (draggingView) {
      // pan view, if dragging middle wheel
      const deltaX = e.clientX - viewDragStartX;
      const deltaY = e.clientY - viewDragStartY;
      // oddness commented elsewhere
      view.timeOffset = viewDragStartTime - view.pxToTime(deltaX);
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

    if (noteBeingCreated.value !== false && e.button !== 1) {
      score.notes.push(noteBeingCreated.value);
      noteBeingCreated.value = false;
    }
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

const clampToZero = (n: number) => n < 0 ? 0 : n;
const noteRect = (note: Note) => {
  const isCut = note.start < view.timeOffset;
  const cutTimeWidth = isCut ? note.start - view.timeOffset : 0;
  return {
    x: clampToZero(view.pxToTimeWithOffset(note.start)),
    w: view.timeToPx(note.duration + cutTimeWidth),
    y: view.octaveToPxOffset(note.octave),
    cut: isCut,
    note: note,
  }
}
const getScopednotes = () => {
  //TODO: also filter by octave component
  return score.notes.filter(note => {
    return note.start < view.timeOffset + view.viewWidthTime &&
      note.start + note.duration > view.timeOffset;
  })
    .map(note => {

      return noteRect(note);
    });
}
</script>

<template>

  <svg id="viewport" ref="timedEventsViewport">

    <!--
      weirdness still present:
      intuitively I would assume that to get from time
      to position, the function would be
      timeToPxWithOffset, but it's not
  -->
    <line :x1=view.pxToTimeWithOffset(playback.currentScoreTime) y1="0"
      :x2=view.pxToTimeWithOffset(playback.currentScoreTime) y2="100%" stroke="red" stroke-width="1" />

    <!-- draw a rectangle representing each note -->
    <NoteElement v-for="noteRect in getScopednotes()" :noteRect="noteRect" />
    <NoteElement v-if="noteBeingCreated" :noteRect="noteRect(noteBeingCreated)" />
  </svg>
  <TimeScrollBar />
  <div style="position: fixed;">
    <Button :onClick="clear" danger>clear</Button>
    <ToolSelector />
  </div>
  <div style="position: fixed; bottom: 0;">
    <Transport />
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