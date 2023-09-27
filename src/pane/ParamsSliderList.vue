<script setup lang="ts">
import { inject, Ref } from "vue";
import Button from "../components/Button.vue";
import NumberArrayEditor from "../components/paramEditors/NumberArrayEditor.vue";
import PropLoadingProgress from "../components/paramEditors/PropLoadingProgress.vue";
import PropOption from "../components/paramEditors/PropOption.vue";
import PropSlider from '../components/paramEditors/PropSlider.vue';
import { useMonoModeInteraction } from "../store/monoModeInteraction";
import { ParamType, SynthParam } from "../synth/SynthInterface";
const infoTextModal = inject<Ref<string>>('modalText');
const monoModeInteraction = useMonoModeInteraction();
defineProps<{
    synthParams: SynthParam[];
}>();
const showInfo = (info: string) => {
    if (!infoTextModal) throw new Error('infoTextModal not injected');
    infoTextModal.value = info;
    monoModeInteraction.activate("credits modal");
}
</script>

<template>
    <template v-for="param in synthParams">
        <PropOption v-if="param.type === ParamType.option" :param="param" />
        <PropSlider v-if="param.type === ParamType.number" :param="param" />
        <PropLoadingProgress v-if="param.type === ParamType.progress" :param="param" />
        <NumberArrayEditor v-if="param.type === ParamType.nArray" :param="param" />
        <Button v-if="param.type === ParamType.infoText" :on-click="() => showInfo(param.value)">{{
            param.displayName }}</Button>
    </template>
</template>