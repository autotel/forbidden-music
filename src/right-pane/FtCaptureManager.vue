<script setup lang="ts">
import { useFtCaptureStore } from "@/store/ftCaptureStore";
import Button from "../components/Button.vue";
import Layers from "../components/icons/Layers.vue";
import { useToolStore } from "../store/toolStore";
import Collapsible from "./Collapsible.vue";

import NumberSynthParam from '@//bottom-pane/components/NumberSynthParam.vue';
import OptionSynthParam from '@//bottom-pane/components/OptionSynthParam.vue';
import { ParamType } from '@/synth/types/SynthParam';

const tool = useToolStore();
const ftCapture = useFtCaptureStore();
const toggleFtRec = () => {
    ftCapture.capturedTones.clear(); 
    tool.ftRec = !tool.ftRec;
}
</script>
<template>
    <Collapsible
        tooltip="Tool to measure or capture external tones by means of Fourier Transform">
        <template #icon>
            <Layers clas="icon" />
            Ft Capture
        </template>
        <br>
        <div class="contents">

            <Button :onClick="toggleFtRec" :active="tool.ftRec">
                Active
            </Button>
            <Button :onClick="() => ftCapture.showText = !ftCapture.showText" :active="ftCapture.showText">
                Show Labels
            </Button>
            <Button :onClick="() => ftCapture.recordToNotes = !ftCapture.recordToNotes"
                :active="ftCapture.recordToNotes">
                Record to notes
            </Button>
            <Button :onClick="() => ftCapture.clearCapturedTones()"
                :active="ftCapture.recordToNotes">
                Clear captured tones
            </Button>
            <div class="audio-filter-params">
                <h4>Audio Filter Parameters</h4>
                <template v-for="param in ftCapture.audioParams">
                    <NumberSynthParam v-if="param.type === ParamType.number" :param="param" />
                    <OptionSynthParam v-else-if="param.type === ParamType.option && param.options.length > 1" :param="param" style="width:15em"/>
                        <!-- <BooleanSynthParam v-else-if="param.type === ParamType.boolean" :param="param" />
                    <NumberArraySynthParam v-else-if="param.type === ParamType.nArray" :param="param" /> -->
                </template>
            </div>

        </div>
    </Collapsible>
</template>


<style>
input[type="file"] {
    display: none;
}

.layer-color {
    border-radius: 50%;
    width: 20px;
    height: 20px;
    border: 1px solid black;
}

.audio-filter-params {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: left;
    height: 100%;
    row-gap: 1em;
    margin: 1em;
}
</style>