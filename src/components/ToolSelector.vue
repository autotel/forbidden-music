<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Tool, toolCasesArray } from '../dataTypes/Tool';
import { MouseDownActions, useToolStore } from '../store/toolStore';
import { useProjectStore } from '../store/projectStore';
import Button from './Button.vue';
import { useRefHistory } from '@vueuse/core';
import { useUndoStore } from '../store/undoStore';

const tool = useToolStore();
const {
  history, undo, redo, canUndo, canRedo, undoStack, redoStack
} = useUndoStore();

const toggleOctaveConstrain = () => {
  tool.disallowTimeChange = !tool.disallowTimeChange;
  if (tool.disallowOctaveChange) {
    tool.disallowOctaveChange = false;
  }
}

const toggleTimeConstrain = () => {
  tool.disallowOctaveChange = !tool.disallowOctaveChange;
  if (tool.disallowTimeChange) {
    tool.disallowTimeChange = false;
  }
}

const mouseDownActionValues = Object.values(MouseDownActions);
const whatWouldMouseMoveDo = ref(MouseDownActions.None);
const whatWouldMouseMoveDoText = ref(mouseDownActionValues[MouseDownActions.None]);

const updateToolWouldDo = () => {
  whatWouldMouseMoveDo.value = tool.whatWouldMouseDownDo();
  whatWouldMouseMoveDoText.value = mouseDownActionValues[whatWouldMouseMoveDo.value];
}

onMounted(() => {
  window.addEventListener('mousemove', updateToolWouldDo);
  window.addEventListener('keydown', updateToolWouldDo);
  window.addEventListener('keyup', updateToolWouldDo);
  window.addEventListener('mousedown', updateToolWouldDo);
  window.addEventListener('mouseup', updateToolWouldDo);
})
onUnmounted(() => {
  window.removeEventListener('mousemove', updateToolWouldDo);
  window.removeEventListener('keydown', updateToolWouldDo);
  window.removeEventListener('keyup', updateToolWouldDo);
  window.removeEventListener('mousedown', updateToolWouldDo);
  window.removeEventListener('mouseup', updateToolWouldDo);
})

</script>

<template>
  <Button v-if="tool.current == Tool.Edit" :active="tool.copyOnDrag" :onClick="() => tool.copyOnDrag = !tool.copyOnDrag"
    tooltip="copy when dragging. [ALT]">
    Copy
  </Button>

  <Button :active="tool.showReferenceKeyboard" :onClick="() => tool.showReferenceKeyboard = !tool.showReferenceKeyboard">
    keybooard
  </Button>

  <Button :class="undoStack.length ? '' : 'disabled'" :onClick="undo">
    ↶ <small>{{ undoStack.length > 0 ? undoStack.length : '' }}</small>
  </Button>
  <Button :class="redoStack.length ? '' : 'disabled'" :onClick="redo">
    ↷
  </Button>
  <!-- <Button :onClick="editNotes.redo" :disabled="editNotes.redoIsPossible">
    ↷
  </Button> -->

  <!-- <Button v-for="(value, k) in toolCasesArray()" 
    :onClick="(e) => {
      e.stopPropagation(); 
      e.stopImmediatePropagation(); 
      e.preventDefault(); 
      tool.current = value.tool
    }"
    :active="tool.current == value.tool"
  >
    {{ value.name }}
  </Button> -->
  <Button :onClick="(e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.preventDefault();
    tool.current = Tool.Select
  }" :active="tool.current == Tool.Select" tooltip="Select mode [CTRL]">
    Select
  </Button>
  <div class="group">
    <label>Constrain</label>
    <Button :active="tool.disallowTimeChange" :onClick="toggleOctaveConstrain">
      ↕
    </Button>
    <Button :active="tool.disallowOctaveChange" :onClick="toggleTimeConstrain">
      ↔
    </Button>
  </div>
  <!-- <p>{{whatWouldMouseMoveDoText}}</p> -->
</template>

<style scoped>
.selected {
  background-color: #888;
  /* color: rgb(196, 0, 0); */
}

.disabled {
  color: #888;
  pointer-events: none;
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
