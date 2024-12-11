<script setup lang="ts">
import Tooltip from '@/components/Tooltip.vue';
import { useBottomPaneStateStore } from '@/store/bottomPaneStateStore';
import { useMonoModeInteraction } from '@/store/monoModeInteraction';
import Button from '../components/Button.vue';
import Cog from '../components/icons/Cog.vue';
import Toggle from '../components/inputs/Toggle.vue';
import isDev from '../functions/isDev';
import isTauri from '../functions/isTauri';
import { ViewportTech, useCustomSettingsStore } from '../store/customSettingsStore';
import { useExclusiveContentsStore } from '../store/exclusiveContentsStore';
import { usePlaybackStore } from '../store/playbackStore';
import { useToolStore } from '../store/toolStore';
import Collapsible from './Collapsible.vue';
import GoFullscreenButton from '@/bottom-pane/components/GoFullscreenButton.vue';

const monoModeInteraction = useMonoModeInteraction();

const userSettings = useCustomSettingsStore();
const exclusives = useExclusiveContentsStore();
const bottomPane = useBottomPaneStateStore();
const tool = useToolStore();
const viewportTechs = [
    { name: 'Pixi', value: ViewportTech.Pixi },
    { name: 'SVG', value: ViewportTech.Svg },
]
const fullReset = () => {
    window.localStorage.clear();
    window.location.reload();
}
const workletWorkbench = () => {
    // e.stopImmediatePropagation()
    monoModeInteraction.activate("plot util")
}

</script>
<template>
    <Collapsible v-if="userSettings.performanceSettingsEnabled" tooltip="To tweak some technical settings">
        <template v-slot:icon>
            <Cog clas="icon" />
            Settings
        </template>
        <div>
            <div class="form-section">Pen & Tablet usability</div>

            <div class="form-row">
                <GoFullscreenButton /> <label> [f11]</label>
            </div>
            <Tooltip
                tooltip="Makes the cursor disappear when dragging on a parameter knob. It's a great usability feature, but can cause trouble in some cases">
                <div class="form-row">
                    <Toggle v-model="userSettings.useKnobCapture" />
                    <label>Use pointer capture</label>
                </div>
            </Tooltip>


            <div class="form-section">Advanced features</div>

            <div v-if="isDev()" class="form-row">
                <Toggle v-model="exclusives.enabled" />
                <label>Exclusives mode</label>
            </div>

            <div class="form-row">
                <Toggle v-model="userSettings.midiInputEnabled" />
                <label>MIDI Input</label>
            </div>


            <div class="form-row">
                <Toggle v-model="bottomPane.rightyMode" />
                <label>Swap transport / tool buttons position</label>
            </div>


            <div class="form-section">Experimental</div>

            <div class="form-row">
                <Toggle v-model="userSettings.physicalEnabled" />
                <label>Calculate frets</label>
            </div>

            <div class="form-row">
                <Toggle v-model="userSettings.showHarp" />
                <label>Harp overlay</label>
            </div>

            <div class="form-row">
                <select v-model="userSettings.viewportTech">
                    <!-- <option :value="null">none</option> -->
                    <option v-for="(tech, k) in viewportTechs" :value="tech.value">{{ tech.name }}</option>
                </select>
                <label>Viewport Tech</label>
            </div>


            <div class="form-row" v-if="userSettings.viewportTech === ViewportTech.Pixi">
                <Toggle v-model="userSettings.showFPS" />
                <label>Show FPS</label>
            </div>

            <div class="form-row" v-if="userSettings.viewportTech === ViewportTech.Pixi">
                <input v-model="userSettings.fontSize" type="number" />
                <label>Font Size</label>
            </div>

            <div class="form-row">
                <Toggle v-model="tool.showReferenceKeyboard" />
                <label>Reference Keyboard</label>
            </div>

            <div class="form-row">
                <input v-model="userSettings.octaveToTimeRatio" type="number" step="0.01" min="0.1" max="4" />
                <label>Octave to time ratio</label>
            </div>

            <div v-if="isDev()" class="form-row">
                <Button v-if="isDev()" @click="workletWorkbench()" tooltip="Open worklet workbench">Worklet
                    workbench
                </Button>

            </div>

            <div class="form-section">Danger zone</div>

            <div class="form-row">
                <Button @click="userSettings.deleteSettings"
                    tooltip="Delete locally stored settings and use default values">Unsave
                    settings</Button>
                <Button v-if="isTauri()" @click="usePlaybackStore().testBeep()" tooltip="Test beep sound">Test
                    beep</Button>

            </div>
            <div class="form-row">
                <Button @click="fullReset" tooltip="Reset locally stored settings to default values">
                    Full reset
                </Button>

                <label> Delete all settings, including projects </label>
            </div>





        </div>
    </Collapsible>
</template>