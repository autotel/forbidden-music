<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Tool } from '../dataTypes/Tool';
import { MouseDownActions, useToolStore } from '../store/toolStore';
import { useUndoStore } from '../store/undoStore';
import Button from './Button.vue';
import { useMonoModeInteraction } from '../store/monoModeInteraction';
const monoModeInteraction = useMonoModeInteraction();
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

const toggleSelectTool = () => {
  if (tool.current == Tool.Select) {
    tool.current = Tool.Edit;
  } else {
    tool.current = Tool.Select;
  }
}
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

  <Button :onClick="toggleSelectTool" :active="tool.current == Tool.Select" tooltip="Select mode [CTRL]">
    Select
  </Button>
  <Button :onClick="(e) => {
    tool.current = Tool.Modulation
  }" :active="tool.current == Tool.Modulation" tooltip="Modulation[M]">
    Modulation
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
