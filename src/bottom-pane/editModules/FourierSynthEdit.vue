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
    <div style="width: 18em" class="layout">
        <div class="group" style="">
            <template class="arrays-cont" v-if="!suspend">
                <NumberArraySynthParam :param="levelsArrayParam" :cols="cols"/>
                <NumberArraySynthParam :param="phasesArrayParam" :cols="cols"/>
            </template>
        </div>
        <div class="group">
            <template v-for="param in audioModule.params">
                <div>
                <NumberSynthParam v-if="param.type === ParamType.number" :param="param" />
                <BooleanSynthParam v-else-if="param.type === ParamType.boolean" :param="param" />
                    <OptionSynthParam 
                        v-else-if="param.type === ParamType.option && param.options.length > 1" 
                        :param="param"
                        @update="refreshArrays"
                    />
                </div>
            </template>
        </div>
    </div>
</template>
<style scoped>
.group {
    width: 100%;
    display: flex;
    justify-content: center;
}
.layout {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-around;
    height: 100%;
}

</style>