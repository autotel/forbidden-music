<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/components/Button.vue';
import { useLayerStore } from '@/store/layerStore';
import { useProjectStore } from '@/store/projectStore';
import { useToolStore } from '@/store/toolStore';
import ToggleLayerMute from '@/components/inputs/ToggleLayerMute.vue';
import Toggle from '@/components/inputs/Toggle.vue';
import Tooltip from '@/components/Tooltip.vue';
const props = defineProps<{
    no: number;
    channelSlotNo: number;
}>();

const layersStore = useLayerStore();
const toolStore = useToolStore();
const project = useProjectStore();

const isLayerAssociatedToMe = computed<boolean>({
    get() {
        return layersStore.layers[props.no].channelSlot === props.channelSlotNo;
    },
    set(value: boolean) {
        console.log('set', value);
        layersStore.layers[props.no].channelSlot = value ? props.channelSlotNo : 0;
    }
});

const layerClickHandler = (no: number) => {
    toolStore.currentLayerNumber = no;
}

const getSwitchTooltip = (isLayerAssociatedToMe: boolean) => {
    return isLayerAssociatedToMe ? 'Connect this layer to default channel (0)' : 'Send notes from this layer to this Synth channel';
}

</script>
<template>
    <Button :onClick="() => layerClickHandler(no)" :class="{ active: toolStore.currentLayerNumber === no }"
        style="width:calc(100% - 2em); display:flex; justify-content: space-between;" class="padded">
        <Tooltip :tooltip="getSwitchTooltip(isLayerAssociatedToMe)">
            <Toggle v-model="isLayerAssociatedToMe" :hidden="channelSlotNo === 0 && isLayerAssociatedToMe" />
        </Tooltip>
        {{ no ? 'Layer' + no : 'Base Layer' }}
        <ToggleLayerMute :layerObject="layersStore.layers[no]" />
    </Button>
</template>
<style scoped>
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