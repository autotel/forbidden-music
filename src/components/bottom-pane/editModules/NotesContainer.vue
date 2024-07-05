<script setup lang="ts">
import Button from '../../../components/Button.vue';
import { useCommunicationStore } from '../../../store/communicationStore';
import { useCustomSettingsStore } from '../../../store/customSettingsStore';
import { useLayerStore } from '../../../store/layerStore';
import { useProjectStore } from '../../../store/projectStore';
import { useToolStore } from '../../../store/toolStore';
import ModuleContainer from '../components/ModuleContainer.vue';
import NoteLayerAssociator from './NotesContainer/NoteLayerAssociator.vue';

defineProps<{
    channelSlotNo: number;
}>();

const layersStore = useLayerStore();
const toolStore = useToolStore();
const project = useProjectStore();
const communications = useCommunicationStore();
const customSettingsStore = useCustomSettingsStore();

const addLayer = () => {
    layersStore.getOrMakeLayerWithIndex(layersStore.layers.length);
}
</script>

<template>
    <ModuleContainer title="Notes input" default-collapsed :no-collapse="!customSettingsStore.layersEnabled" :padding="customSettingsStore.layersEnabled">
        <template #default>
            <div class="col" v-if="customSettingsStore.layersEnabled">
                <h3 class="padded">Receive layers</h3>
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