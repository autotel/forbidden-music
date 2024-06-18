<script setup lang="ts">
import { ref } from 'vue';
import Button from '../../components/Button.vue';
import { SynthChain } from '../../dataStructures/SynthChain';
import { SynthStack } from '../../dataStructures/SynthStack';
import ChainContainer from '../ChainContainer.vue';
import ModuleContainer from '../components/ModuleContainer.vue';
const props = defineProps<{
    stack: SynthStack,
    root?: boolean,
    remove?: () => void,
}>();
const emits = defineEmits<{
    (e: 'change', newValue: SynthStack): void
}>();

const visibleChain = ref<SynthChain | null>(null);

const addLayer = () => {
    props.stack.addChain();
    emits('change', props.stack);
}

const handleRemoveClick = () => {
    if (props.remove) return props.remove();
    throw new Error('no remove handler');
}

</script>

<template>
    <ModuleContainer title="rack">
        <template #icons>
            <Button v-if="props.remove" danger :onClick="handleRemoveClick" tooltip="delete"
                style="background-color:transparent">×</Button>
        </template>
        <template #default>
            <div style="" class="col">
                <template v-for="(am, no) in stack.chains">
                    <Button :onClick="() => visibleChain = am" :class="{ active: visibleChain === am }"
                        style="width:calc(100% - 2em); display:flex; justify-content: space-between;" class="padded">
                        chain {{ no }}
                    </Button>
                </template>
                <Button :onClick="addLayer"
                    style="width:calc(100% - 2em); display:flex; justify-content: space-between;" class="padded">
                    +
                </Button>
            </div>
                <ChainContainer v-if="visibleChain" :synthChain="visibleChain" />
        </template>
    </ModuleContainer>
</template>
<style scoped>
.col {
    padding-top: 0.6em;
    height: 18em;
    width: 12em;
    overflow: auto;
    position: relative;
    flex-grow: 0;
    flex-shrink: 0;
}

.active {}

</style>