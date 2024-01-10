<script setup lang="ts">
import { computed } from 'vue';
import { ViewportTech } from '../store/customSettingsStore';
import { useCustomSettingsStore } from '../store/customSettingsStore';
import Cog from '../components/icons/Cog.vue';
import Collapsible from './Collapsible.vue';
import Toggle from '../components/inputs/Toggle.vue';
import Button from '../components/Button.vue';
import isDev from '../functions/isDev';
import { usePlaybackStore } from '../store/playbackStore';
import isTauri from '../functions/isTauri';
import { useExclusiveContentsStore } from '../store/exclusiveContentsStore';
import { useViewStore } from '../store/viewStore';
import { useToolStore } from '../store/toolStore';

const userSettings = useCustomSettingsStore();
const exclusives = useExclusiveContentsStore();
const view = useViewStore();
const tool = useToolStore();
const viewportTechs = [
    { name: 'Pixi', value: ViewportTech.Pixi },
    { name: 'SVG', value: ViewportTech.Svg },
]
const fullReset = () => {
    window.localStorage.clear();
    window.location.reload();
}

</script>
<template>
    <Collapsible v-if="userSettings.performanceSettingsEnabled" tooltip="To tweak some technical settings">
        <template v-slot:icon>
            <Cog clas="icon" />
            Settings
        </template>
        <div>
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

            <div class="form-section">Advanced features</div>

            <div class="form-row">
                <Toggle v-model="userSettings.midiInputEnabled" />
                <label>MIDI Input</label>
            </div>

            <div class="form-row" :class="{ disabled: !exclusives.enabled }">
                <Toggle v-model="userSettings.layersEnabled" />
                <label>Multi-layer</label>
            </div>

            <div class="form-row" :class="{ disabled: !userSettings.layersEnabled }">
                <Toggle v-model="userSettings.multiTimbralityEnabled" />
                <label>Multi-timbre</label>
            </div>

            <div class="form-section">Experimental</div>

            <div class="form-row">
                <Toggle v-model="userSettings.effectsEnabled" />
                <label>Use audio FX</label>
            </div>

            <div class="form-row">
                <Toggle v-model="userSettings.physicalEnabled" />
                <label>Calculate frets</label>
            </div>

            <div class="form-row">
                <select v-model="userSettings.viewportTech">
                    <!-- <option :value="null">none</option> -->
                    <option v-for="(tech, k) in viewportTechs" :value="tech.value">{{ tech.name }}</option>
                </select>
                <label>Viewport Tech</label>
            </div>
            <!-- 
            <div class="form-row">
                <Toggle v-model="userSettings.performanceSettingsEnabled" />
                <label>Performance Settings (!)</label>
            </div> -->
            <div v-if="isDev()" class="form-row">
                <Button @click="fullReset" tooltip="Reset locally stored settings to default values">
                    Full reset
                </Button>
            </div>

            <Button @click="userSettings.deleteSettings"
                tooltip="Delete locally stored settings and use default values">Unsave settings</Button>
            <Button v-if="isTauri()" @click="usePlaybackStore().testBeep()" tooltip="Test beep sound">Test beep</Button>




        </div>
    </Collapsible>
</template>