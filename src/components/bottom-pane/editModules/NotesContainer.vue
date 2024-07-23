<script setup lang="ts">
import Button from '../../../components/Button.vue';
import { useCustomSettingsStore } from '../../../store/customSettingsStore';
import { useLayerStore } from '../../../store/layerStore';
import ModuleContainer from '../components/ModuleContainer.vue';
import NoteLayerAssociator from './NotesContainer/NoteLayerAssociator.vue';

defineProps<{
    channelSlotNo: number;
}>();

const layersStore = useLayerStore();
const customSettingsStore = useCustomSettingsStore();

const addLayer = () => {
    layersStore.getOrMakeLayerWithIndex(layersStore.layers.length);
}
</script>

<template>
    <ModuleContainer 
        title="Notes input" 
        default-collapsed
    >
        <template #default>
            <div class="col">
                
                <div class="padded">
                    <h3>Receive layers</h3>
                    <small>Layers connected to this synth channel</small>
                </div>
                <template v-for="(layer, no) in layersStore.layers">
                    <NoteLayerAssociator :no="no" :channel-slot-no="channelSlotNo" />
                </template>
                <Button :onClick="addLayer"
                    style="width:calc(100% - 2em); display:flex; justify-content: space-between;" class="padded">
                    +
                </Button>
            </div>
        </template>
    </ModuleContainer>
</template>
<style scoped>
.col {
    height: 18em;
    width: 12em;
    overflow: auto;
    position: relative;
    flex-grow: 0;
    flex-shrink: 0;
    /* margin-top: 0.5em; */
}

</style>