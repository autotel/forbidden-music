<script setup lang="ts">
import { ref, watch } from 'vue';
import { ProgressSynthParam } from '../../synth/types/SynthParam';

const props = defineProps({
    param: {
        type: Object as () => ProgressSynthParam,
        required: true,
    },
});

const displayProgress = ref(0);

const updateDisplayProgress = () => {
    displayProgress.value = props.param.value;
}

watch(() => props.param.value, updateDisplayProgress);

setInterval(updateDisplayProgress, 1000);

</script>
<template>
    <div class="load-progress-container">
        {{ props.param.displayName }}
        <template v-if="props.param.max !== undefined && props.param.min !== undefined">
            <div class="prog-container">
                <div class="prog-bar" :style="{
                    width: (displayProgress > 0 ? (displayProgress / props.param.max) : (displayProgress / props.param.min)) * 100 + '%',
                    left: (displayProgress > 0 ? 0 : (1 - displayProgress / props.param.min)) * 100 + '%',
                }"></div>
            </div>
        </template>
        <span style="position: absolute; z-index: 2;">
            {{ displayProgress?.toFixed(1) }} / {{ props.param.max?.toFixed(1) }}
        </span>
    </div>

</template>
<style>
.prog-bar {
    position: absolute;
    height: 100%;
    background-color: rgba(0, 94, 117, 0.466);
    top: 0;
}

.prog-container {
    position: absolute;
    height: 100%;
    width: 100%;
    top: 0;
}

.active {
    background-color: rgb(7, 77, 99);
}

.load-progress-container {
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
    width:100%;
    box-sizing: border-box;

}
</style>
