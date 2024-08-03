<script setup lang="ts">

import { computed, ref } from 'vue';
import { AudioModule } from '@/synth/types/AudioModule';
import { ParamType } from '@/synth/types/SynthParam';
import NumberSynthParam from '../components/NumberSynthParam.vue';
import BooleanSynthParam from '../components/BooleanSynthParam.vue';
import OptionSynthParam from '../components/OptionSynthParam.vue';
import NumberArraySynthParam from '../components/NumberArraySynthParam.vue';
import ModuleContainer from '../components/ModuleContainer.vue';
import { FourierSynth } from '@/synth/generators/FourierSynth';

const props = defineProps<{
    audioModule: FourierSynth
}>();
const suspend = ref(false);
const width = 8;
const levelsArrayParam = ref(props.audioModule.levelsArrayParam);
const phasesArrayParam = ref(props.audioModule.phasesArrayParam);
const cols = computed(()=>{
    if(props.audioModule.levelsArrayParam.value.length > 32){
        return 8;
    }
    return 4;
});
const refreshArrays = () => {
    suspend.value = true;
    setTimeout(() => {
        suspend.value = false;
    }, );
}
</script>
<template>
    <div :style="{width}" class="layout">
        <template class="arrays-cont" v-if="!suspend">
            <NumberArraySynthParam :param="levelsArrayParam" :cols="cols"/>
            <NumberArraySynthParam :param="phasesArrayParam" :cols="cols"/>
        </template>
        <template v-for="param in audioModule.params">
            <NumberSynthParam v-if="param.type === ParamType.number" :param="param" />
            <BooleanSynthParam v-else-if="param.type === ParamType.boolean" :param="param" />
            <OptionSynthParam 
                v-else-if="param.type === ParamType.option && param.options.length > 1" 
                :param="param"
                @update="refreshArrays"
            />
        </template>
    </div>
</template>
<style scoped>
.layout {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: center;
    height: 100%;
}
</style>