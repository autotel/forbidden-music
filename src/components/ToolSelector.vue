<script setup lang="ts">
import { Tool } from '../dataTypes/Tool';
import { KeyActions, getKeyCombinationString } from '../keyBindings';
import { MouseDownActions, useToolStore } from '../store/toolStore';
import { useUndoStore } from '../store/undoStore';
import Button from './Button.vue';
const tool = useToolStore();
const {
  history, undo, redo, canUndo, canRedo, undoStack, redoStack
} = useUndoStore();
const k = (key: KeyActions) => getKeyCombinationString(key)[0] || '';
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
  <div>
    <Button v-if="tool.current == Tool.Edit" :active="tool.copyOnDrag" :onClick="() => tool.copyOnDrag = !tool.copyOnDrag"
      tooltip="copy when dragging. [ALT]">
      Copy
    </Button>

    <Button :active="tool.showReferenceKeyboard"
      :onClick="() => tool.showReferenceKeyboard = !tool.showReferenceKeyboard">
      keybooard
    </Button>

    <Button :tooltip="`undo [${k(KeyActions.Undo)}]`" :class="undoStack.length ? '' : 'disabled'" :onClick="undo">
      ↶ <small>{{ undoStack.length > 0 ? undoStack.length : '' }}</small>
    </Button>
    <Button :tooltip="`redo`" :class="redoStack.length ? '' : 'disabled'" :onClick="redo">
      ↷
    </Button>

    <Button :onClick="toggleSelectTool" :active="tool.whatWouldMouseDownDo() === MouseDownActions.AreaSelect"
      :tooltip="`Select [${k(KeyActions.ActivateAreaSelectionMode)}]`">
      Select
    </Button>
    <Button :onClick="(e) => {
      tool.current = Tool.Modulation
    }" :active="tool.current == Tool.Modulation" :tooltip="`Modulation mode [${k(KeyActions.ActivateModulationMode)}]`">
      Modulation
    </Button>
    <div class="group">
      <label>Constrain</label>
      <Button :tooltip="`prevent horizontal movement [${k(KeyActions.OnlyAllowVerticalMovement)}]`"
        :active="tool.disallowTimeChange" :onClick="toggleOctaveConstrain">
        ↕
      </Button>
      <Button :tooltip="`prevent vertical movement [${k(KeyActions.OnlyAllowHorizontalMovement)}]`"
        :active="tool.disallowOctaveChange" :onClick="toggleTimeConstrain">
        ↔
      </Button>
    </div>
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
