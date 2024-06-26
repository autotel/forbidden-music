<script setup lang="ts">
import { ref } from 'vue';
import Button from '../../../components/Button.vue';
import ButtonSub from '../../../components/ButtonSub.vue';
import { SynthChain } from '../../../dataStructures/SynthChain';
import { SynthStack } from '../../../dataStructures/SynthStack';
import ChainContainer from '../ChainContainer.vue';
import ModuleContainer from '../components/ModuleContainer.vue';
const props = defineProps<{
    audioModule: SynthStack,
    root?: boolean,
    remove?: () => void,
}>();
const emits = defineEmits<{
    (e: 'change', newValue: SynthStack): void
}>();

const visibleChain = ref<SynthChain | null>(props.audioModule.children[0] ?? null);
const layersArray = ref([...props.audioModule.children]);

const addLayer = () => {
    const newChain = props.audioModule.addChain();
    layersArray.value = [...props.audioModule.children];
    emits('change', props.audioModule);
    setTimeout(() => {
        visibleChain.value = newChain;
    }, 0);
}

const removeLayer = (index: number) => {
    props.audioModule.removeChain(index);
    layersArray.value = [...props.audioModule.children];
    visibleChain.value = null;
    emits('change', props.audioModule);
}

const handleRemoveClick = () => {
    if (props.remove) return props.remove();
    throw new Error('no remove handler');
}

</script>

<template>
    <div class="col">
        <template v-for="(am, no) in layersArray">
            <Button :onClick="() => visibleChain = am" :class="{ active: visibleChain === am }"
                style="width:calc(100% - 2em); display:flex; justify-content: space-between;" class="padded">
                chain {{ no }}
                <ButtonSub danger :onClick="() => removeLayer(no)" tooltip="delete">×</ButtonSub>
            </Button>

        </template>
        <Button :onClick="addLayer" style="width:calc(100% - 2em); display:flex; justify-content: space-between;"
            class="padded">
            +
        </Button>
    </div>
    <div class="chain-container">
        <ChainContainer v-if="visibleChain" :synthChain="visibleChain" />
    </div>
</template>
<style scoped>
.col {
    height: 18em;
    width: 12em;
    overflow: auto;
    position: relative;
    flex-grow: 0;
    flex-shrink: 0;
}

.chain-container {
    position: relative;
    display: flex;
    top: -0.55em;
    gap: 0.4em;
}

.active {
    background-color: rgba(238, 130, 238, 0.425);
}
</style>