<script setup lang="ts">
import { ref, watch } from 'vue';
import NumberKnob from './NumberKnob.vue';
import { ArraySynthParam } from '../../synth/types/SynthParam';
const props = defineProps({
    param: {
        type: Object as () => ArraySynthParam,
        required: true,
    },
});
const emit = defineEmits({
    'update:param': (val: ArraySynthParam) => true,
});
const liveArray = ref(props.param.value);

watch(liveArray, () => {
    props.param.value = liveArray.value;
});

watch(()=>props.param.value, () => {
    liveArray.value = props.param.value;
});

watch(()=>props.param.updateFlag, () => {
    liveArray.value = props.param.value;
});

const update = (val:number, i: number) => {
    liveArray.value[i] = val;
    props.param.value = liveArray.value;
    emit("update:param", props.param);
};

</script>
<template>
    <div class="row-container">
        {{ props.param.displayName }}
        <div class="knobs-array-container">
            <NumberKnob
                v-for="(val, i) in liveArray"
                :key="i"
                :value="val"
                :min="props.param.min"
                :max="props.param.max"
                :model-value="liveArray[i]"
                @update:modelValue="update($event, i)"
                vertical
            ></NumberKnob>
        </div>
    </div>
</template>
<style scoped>
.knobs-array-container{
    display: flex;
    flex-wrap: wrap;

}
.row-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
}
</style>