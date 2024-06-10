<script setup lang="ts">
import Button from '../components/Button.vue';
import Magnet from "../components/icons/Magnet.vue";
import Pen from "../components/icons/Pen.vue";
import Switch from "../components/icons/Switch.vue";
import { SnapType, useSnapStore } from '../store/snapStore';
import Collapsible from './Collapsible.vue';
import { useMonoModeInteraction } from '../store/monoModeInteraction';
import { useCustomSettingsStore } from '../store/customSettingsStore';
import ButtonSub from '../components/ButtonSub.vue';

const snap = useSnapStore();
const monoModeInteraction = useMonoModeInteraction();
const userSettings = useCustomSettingsStore();

const frequencyTableEditButtonHandler = (e: MouseEvent) => {
  e.stopImmediatePropagation()
  monoModeInteraction.activate("octave table editor")
  snap.values.customFrequencyTable.active = true
}
const relationFractionEditButtonHandler = (e: MouseEvent) => {
  e.stopImmediatePropagation()
  monoModeInteraction.activate("relation fraction editor")
  snap.values.hzRelationFraction.active = true
}
const onlyWithNotesInTheSameLayerToggle = (e: MouseEvent) => {
  e.stopImmediatePropagation()
  snap.onlyWithNotesInTheSameLayer = !snap.onlyWithNotesInTheSameLayer
  if (snap.onlyWithNotesInTheSameLayer) {
    snap.onlyWithNotesInDifferentLayer = false
  }
}
const onlyWithyNotesInDifferentLayerToggle = (e: MouseEvent) => {
  e.stopImmediatePropagation()
  snap.onlyWithNotesInDifferentLayer = !snap.onlyWithNotesInDifferentLayer
  if (snap.onlyWithNotesInDifferentLayer) {
    snap.onlyWithNotesInTheSameLayer = false
  }
}

</script>

<template>
  <Collapsible
    tooltip="Select which constraints to enforce when adding new notes. Hover each button for a small explanation">
    <template v-slot:icon>
      <Magnet clas="icon" />
      Constraints
    </template>
    <Button v-for="(isnap, snapName) in snap.values" :onClick="() => isnap.active = !isnap.active" :class="{
      active: isnap.active,
      time: isnap.type === SnapType.Time,
      tone: isnap.type === SnapType.Tone,
      toneRelation: isnap.type === SnapType.ToneRelation,
      toneRelationMulti: isnap.type === SnapType.ToneRelationMulti,
      highlight: snap.currentlyInvolvedSnaps.includes(isnap),
    }" :tooltip="isnap.description">
      {{ isnap.icon }}
      <template v-if="snapName === 'customFrequencyTable'">
        <ButtonSub :onClick="frequencyTableEditButtonHandler" tooltip="Edit custom frequencies table">
          <Pen />
        </ButtonSub>
      </template>
      <template v-else-if="snapName === 'hzRelationFraction' || snapName === 'timeFraction'">
        <ButtonSub class="sub-button" :onClick="relationFractionEditButtonHandler"
          tooltip="define how much to round down">
          <Pen />
        </ButtonSub>
      </template>
    </Button>
    <Button :onClick="() => snap.onlyWithMutedNotes = !snap.onlyWithMutedNotes"
      :class="{ active: snap.onlyWithMutedNotes }"
      tooltip="Snap only in relation to muted notes. Use CTRL+M to mute a note">
      Muted
    </Button>
    <Button :onClick="() => snap.onlyWithSimultaneousNotes = !snap.onlyWithSimultaneousNotes"
      :class="{ active: snap.onlyWithSimultaneousNotes }"
      tooltip="Snap only in relation to notes which overlap in time">
      Simultaneous
    </Button>
    <Button :onClick="() => snap.onlyWithNotesInView = !snap.onlyWithNotesInView"
      :class="{ active: snap.onlyWithNotesInView }" tooltip="only with notes in the screen's range">
      In view
    </Button>
    <template v-if="userSettings.layersEnabled">
      <Button :onClick="onlyWithNotesInTheSameLayerToggle" :class="{ active: snap.onlyWithNotesInTheSameLayer }"
        tooltip="only with notes in the same layer">
        == layer
      </Button>
      <Button :onClick="onlyWithyNotesInDifferentLayerToggle" :class="{ active: snap.onlyWithNotesInDifferentLayer }"
        tooltip="only with notes in a different layer">
        != layer
      </Button>
    </template>
  </Collapsible>
</template>

<style scoped>
.active {
  /* border-bottom: solid 4px;
  padding-bottom: 0; */
  /* text-shadow: 0 0px 5 white; */
  opacity: 1;
  /* top: -4px; */
  /* border-bottom: solid 4px; */
  /* text-decoration: underline; */

}

.button:not(.active, :hover) {
  color: rgba(0, 0, 0, 0.5);
}

.time {
  background-color: rgb(0, 99, 145);
}


.time.active,
.time:hover,
.time.active:hover {
  background-color: rgb(105, 207, 255);
}

.tone {
  background-color: rgb(187, 153, 0);
}

.tone.active,
.tone:hover,
.tone.active:hover {
  background-color: rgb(255, 230, 116);
}

.toneRelation {
  background-color: rgb(199, 139, 61);
}

.toneRelation.active,
.toneRelation:hover,
.toneRelation.active:hover {
  background-color: rgb(255, 195, 116);
}

.toneRelationMulti {
  background-color: rgb(192, 158, 177);
}

.toneRelationMulti.active,
.toneRelationMulti:hover,
.toneRelationMulti.active:hover {
  background-color: rgb(255, 151, 208);
}


.button.highlight {
  color: rgb(0, 0, 0);
  border: solid 2px;
  position: relative;
  z-index: 2;
}

@media (prefers-color-scheme: dark) {
  button.active {
    color: black;
  }

  .button:not(.active, :hover) {
    color: rgba(255, 255, 255, 0.747);
  }

  .button.highlight {
    color: rgb(255, 255, 255);
    border: solid 2px;
    position: relative;
    z-index: 2;
  }

}
</style>
