<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { EditNote } from '../dataTypes/EditNote';
import { Tool } from '../dataTypes/Tool';
import { useSelectStore } from '../store/selectStore';
import { useToolStore } from '../store/toolStore';
import NumberKnob from './NumberKnob.vue';

const testModel = ref([1, 0, 1, -0.5]);
</script>
<template>
    <div style="position: absolute; right: 10px; top: 100px; width: 200px">
        <NumberKnob v-model="testModel[0]" />
        <NumberKnob v-model="testModel[1]" />
        <NumberKnob v-model="testModel[2]" />
        <NumberKnob v-model="testModel[3]" />
    </div>
</template>