<script setup lang="ts">
import { useSelectStore } from '@/store/selectStore';
import { Tool } from '../dataTypes/Tool';
import { KeyActions, getKeyCombinationString } from '../keyBindings';
import { useHistoryStore } from '../store/historyStore';
import { useToolStore } from '../store/toolStore';
import Button from './Button.vue';
import { useProjectStore } from '@/store/projectStore';
import { computed } from 'vue';
const tool = useToolStore();
const {
  undo, redo, undoStack, redoStack
} = useHistoryStore();
const selection = useSelectStore();
const k = (key: KeyActions) => getKeyCombinationString(key)[0] || '';
const toggleOctaveConstrain = () => {
  tool.mouse.disallowTimeChange = !tool.mouse.disallowTimeChange;
  if (tool.mouse.disallowOctaveChange) {
    tool.mouse.disallowOctaveChange = false;
  }
}

const toggleTimeConstrain = () => {
  tool.mouse.disallowOctaveChange = !tool.mouse.disallowOctaveChange;
  if (tool.mouse.disallowTimeChange) {
    tool.mouse.disallowTimeChange = false;
  }
}

const toggleSelectTool = () => {
  tool.currentLeftHand === Tool.Select ? (tool.currentLeftHand = Tool.Edit) : (tool.currentLeftHand = Tool.Select)
}

const deleteSelected = () => {
  selection.deleteSelected();
}

const showDeleteButton = computed(() => {
  return selection.length > 0;
})

</script>

<template>
  <div id="tools-container">
    <Button v-if="tool.current == Tool.Edit" :active="tool.copyOnDrag"
      :onClick="() => tool.copyOnDrag = !tool.copyOnDrag" tooltip="copy when dragging. [ALT]">
      Copy
    </Button>

    <Button :active="tool.currentLeftHand === Tool.Select"
      :onClick="toggleSelectTool"
      tooltip="Select mode [Ctl]">
      Select
    </Button>


    <Button v-if="showDeleteButton"
      :onClick="() => deleteSelected()"
      tooltip="Delete selected">
      Del
    </Button>

    <Button :tooltip="`undo [${k(KeyActions.Undo)}]`" :class="undoStack.length ? '' : 'disabled'" :onClick="undo">
      ↶ <small>{{ undoStack.length > 0 ? undoStack.length : '' }}</small>
    </Button>
    <Button :tooltip="`redo`" :class="redoStack.length ? '' : 'disabled'" :onClick="redo">
      ↷
    </Button>
    <Button :onClick="(e) => {
      tool.current = tool.current === Tool.Modulation ? Tool.Edit : Tool.Modulation;
    }" :active="tool.current == Tool.Modulation"
      :tooltip="`Modulation mode [${k(KeyActions.ActivateModulationMode)}]`">
      Modulation
    </Button>
    <Button :onClick="(e) => {
      tool.current = tool.current === Tool.Loop ? Tool.Edit : Tool.Loop;
    }" :active="tool.current == Tool.Loop" :tooltip="`Loop mode [${k(KeyActions.ActivateLoopMode)}]`">
      Loop
    </Button>
    <div class="group">
      <label>Constrain</label>
      <Button id="prevent-horizontal-movement"
        :tooltip="`prevent horizontal movement [${k(KeyActions.OnlyAllowVerticalMovement)}]`"
        :active="tool.mouse.disallowTimeChange" :onClick="toggleOctaveConstrain">
        ↕
      </Button>
      <Button id="prevent-vertical-movement"
        :tooltip="`prevent vertical movement [${k(KeyActions.OnlyAllowHorizontalMovement)}]`"
        :active="tool.mouse.disallowOctaveChange" :onClick="toggleTimeConstrain">
        ↔
      </Button>
    </div>
  </div>
  <!-- <p>{{whatWouldMouseMoveDoText}}</p> -->
</template>

<style scoped>
#tools-container {
  bottom: 0;
  display: flex;
  position: relative;
  align-items: center;
  flex-wrap: wrap;
}

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
