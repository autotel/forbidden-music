<script setup lang="ts">
import Button from '@/components/Button.vue';
import ToolSelector from '@/components/ToolSelector.vue';
import Transport from '@/components/Transport.vue';
import AnglesDown from '@/components/icons/AnglesDown.vue';
import AnglesUp from '@/components/icons/AnglesUp.vue';
import { synthPaneHeight, useBottomPaneStateStore } from '@/store/bottomPaneStateStore';
import { VueElement, onBeforeUnmount, onMounted, ref } from 'vue';
import SynthPane from './SynthPane.vue';

const bottomPaneStore = useBottomPaneStateStore();
const toolPane = ref<VueElement | null>(null);
const toggleSynthPane = () => {
    bottomPaneStore.synthPaneOpen = !bottomPaneStore.synthPaneOpen;
}
const windowResizedListener = () => {
    bottomPaneStore.toolbarMeasuredHeight = toolPane.value ? toolPane.value.clientHeight : 0;
}

onMounted(() => {
    window.addEventListener('resize', windowResizedListener);
    windowResizedListener();
})
onBeforeUnmount(() => {
    window.removeEventListener('resize', windowResizedListener);
})

</script>

<template>
    <div class="toolbars-container bg-colored" ref="toolPane">
        <div :style="{
            position: 'absolute',
            bottom: `${bottomPaneStore.toolbarMeasuredHeight}px`,
            left: '0px',
            height: `${synthPaneHeight}px`
        }">
            <SynthPane v-if="bottomPaneStore.synthPaneOpen" :paneHeight="synthPaneHeight" />
        </div>

        <template v-if="bottomPaneStore.rightyMode">
            <ToolSelector>
                <div style="display:flex; align-items: center; height: 100%;">
                    <Button :onClick="toggleSynthPane">
                        <AnglesDown v-if="synthPaneHeight" />
                        <AnglesUp v-else />
                        Synth
                    </Button>
                </div>
            </ToolSelector>
            <Transport />
        </template>
        <template v-else>
            <Transport />
            <div style="display:flex; align-items: center; height: 100%;">
                <Button :onClick="toggleSynthPane">
                    <AnglesDown v-if="bottomPaneStore.synthPaneOpen" />
                    <AnglesUp v-else />
                    Synth
                </Button>
            </div>
            <ToolSelector />
        </template>
    </div>
</template>

<style scoped>
.toolbars-container {
    position: fixed;
    bottom: 0px;
    left: 0px;
    width: 100vw;
    display: flex;
    justify-content: space-between;
    align-items: end;
}
</style>
