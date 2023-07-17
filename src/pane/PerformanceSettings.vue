<script setup lang="ts">
import { computed } from 'vue';
import { ViewportTech } from '../store/customSettingsStore';
import { useCustomSettingsStore } from '../store/customSettingsStore';
import Cog from '../components/icons/Cog.vue';
import Collapsible from './Collapsible.vue';
import Toggle from '../components/inputs/Toggle.vue';
import Button from '../components/Button.vue';

const userSettings = useCustomSettingsStore();

const viewportTechs = [
    { name: 'Pixi', value: ViewportTech.Pixi },
    { name: 'SVG', value: ViewportTech.Svg },
    { name: 'Canvas', value: ViewportTech.Canvas },
]


</script>
<template>
    <Collapsible pulltip="Performance and dev settings">
        <template v-slot:icon>
            <Cog clas="icon"/>
            Performance Settings
        </template>
        <div>
            <div class="form-row">
                <select v-model="userSettings.viewportTech">
                    <!-- <option :value="null">none</option> -->
                    <option v-for="(tech, k) in viewportTechs" :value="tech.value">{{ tech.name }}</option>
                </select>
                <label>Viewport Tech</label>
            </div>
            <div class="form-row" v-if="userSettings.viewportTech===ViewportTech.Pixi">
                <Toggle v-model="userSettings.showFPS" />
                <label>Show FPS</label>
            </div>
            <div class="form-row" v-if="userSettings.viewportTech===ViewportTech.Pixi">
                <input v-model="userSettings.fontSize" type="number"/>
                <label>Font Size</label>
            </div>
            <Button @click="userSettings.deleteSettings" tooltip="Delete locally stored settings and use default values">Reset settings</Button>
        </div>
    </Collapsible>
</template>
<style scoped>
.form-row {
    display: flex;
    justify-content: space-between;
    margin-top: 1em;
}
</style>