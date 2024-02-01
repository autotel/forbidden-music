<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ReadoutSynthParam } from '../../synth/SynthInterface';
import { useToolStore } from '../../store/toolStore';
import { useAutomationLaneStore } from '../../store/automationLanesStore';
import Tooltip from '../Tooltip.vue';

const props = defineProps<{
    param: ReadoutSynthParam,
}>();

const displayText = ref(props.param.value);
watch(() => props.param.value, (newVal) => {
    displayText.value = newVal;
});

</script>
<template>
    
    <div class="val-container" style="width:100%">
            <div class="val-container">
                <p>{{displayText}}</p>
            </div>
    </div>
</template>
<style>
.val-container {
    position: absolute;
    height: 100%;
    width: 100%;
    top: 0;
    
    user-select: none;
    display: inline-flex;
    position: relative;
    border: solid 1px rgb(166, 172, 172);
    background-color: rgb(1, 22, 15);
    color: white;
    font-family: monospace;
    height: 2em;
    align-items: center;
    text-align: center;
    justify-content: center;
    box-sizing: border-box;
}


</style>
