<script setup lang="ts">
import { ref } from 'vue';
import { AudioModule } from '../../synth/interfaces/AudioModule';
import Button from '../../components/Button.vue';
import AudioModuleContainer from '../AudioModuleContainer.vue';
import AddSynth from '../components/AddSynth.vue';
import { SynthConstructorWrapper, useSynthStore } from '../../store/synthStore';
import SynthSelector from '../SynthSelector.vue';
import { useBottomPaneStateStore } from '../../store/bottomPaneStateStore';
import { SynthChain } from '../../dataStructures/SynthChain';
import { SynthStack } from '../../dataStructures/SynthStack';
import ChainContainer from '../ChainContainer.vue';
const props = defineProps<{
    stack: SynthStack,
}>();
const emits = defineEmits<{
    (e: 'change', newValue: SynthStack): void
}>();
const synthStore = useSynthStore();
const visibleChain = ref<SynthChain | null>(null);
const panelState = useBottomPaneStateStore();
const addLayer = () => {
    props.stack.push(new SynthChain());
    emits('change', props.stack);
}

</script>

<template>
    <div style="" class="col">
        <template v-for="(am, no) in stack">
            <Button :onClick="() => visibleChain = am"
                style="width:calc(100% - 2em); display:flex; justify-content: space-between;" class="padded">
                chain {{ no }}
            </Button>
        </template>
        <Button :onClick="() => visibleChain = null"
            style="width:calc(100% - 2em); display:flex; justify-content: space-between;" class="padded">
            +
        </Button>
        <span> not good solution:
            no more than one module per "path", also had to distort the functioning of synthstore rewiring.

        </span><span>
            Instead I should create an abstraction for chains and stacks, then use those shared abstractions on
            the synthstore and the parallelchain module
        </span>
    </div>
    <ChainContainer v-if="visibleChain" :synthChain="visibleChain" />
    <template v-else>
        <div :style="{
            width: 'auto',
            backgroundColor: 'transparent',
            position: 'relative',
            display: 'flex',
            flexDirection: 'row',
            height: '18em'
        }">
            <div style="height:100%; overflow-y: auto;">
                <SynthSelector @select="addLayer" />
            </div>
        </div>
    </template>
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
</style>