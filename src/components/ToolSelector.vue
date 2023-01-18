<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Tool, toolCasesArray } from '../dataTypes/Tool';
import { MouseDownActions, useToolStore } from '../store/toolStore';
import { useEditNotesStore } from '../store/editNotesStore';
import Button from './Button.vue';
import { useRefHistory } from '@vueuse/core';

const tool = useToolStore();
const editNotes = useEditNotesStore();
const toggleOctaveConstrain = () => {
  tool.constrainOctave = !tool.constrainOctave;
  if (tool.constrainTime) {
    tool.constrainTime = false;
  }
}
const toggleTimeConstrain = () => {
  tool.constrainTime = !tool.constrainTime;
  if (tool.constrainOctave) {
    tool.constrainOctave = false;
  }
}

const AXT = Object.values(MouseDownActions);
const whatWouldMouseMoveDo = ref(MouseDownActions.None);
const whatWouldMouseMoveDoText = ref(AXT[MouseDownActions.None]);

const updateToolWouldDo = () => {
  whatWouldMouseMoveDo.value = tool.whatWouldMouseDownDo();
  whatWouldMouseMoveDoText.value = AXT[whatWouldMouseMoveDo.value];
}

const { history, undo, redo } = useRefHistory(editNotes.list);

onMounted(()=>{
  window.addEventListener('mousemove', updateToolWouldDo);
  window.addEventListener('keydown', updateToolWouldDo);
  window.addEventListener('keyup', updateToolWouldDo);
  window.addEventListener('mousedown', updateToolWouldDo);
  window.addEventListener('mouseup', updateToolWouldDo);
})
onUnmounted(()=>{
  window.removeEventListener('mousemove', updateToolWouldDo);
  window.removeEventListener('keydown', updateToolWouldDo);
  window.removeEventListener('keyup', updateToolWouldDo);
  window.removeEventListener('mousedown', updateToolWouldDo);
  window.removeEventListener('mouseup', updateToolWouldDo);
})

</script>

<template>
  <Button v-if="undo" :onClick="undo">
    ↶
  </Button>
  <!-- <Button :onClick="editNotes.redo" :disabled="editNotes.redoIsPossible">
    ↷
  </Button> -->

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
  <p>{{whatWouldMouseMoveDoText}}</p>

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
