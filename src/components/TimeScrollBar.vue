<script setup lang="ts">
import { Store } from 'pinia';
import { onMounted, ref } from 'vue'
import { useViewStore } from '../store/viewStore';
import { View } from '../View';

const view = useViewStore();

const hScrollBar = ref<HTMLDivElement>();

onMounted(()=>{
    const $hScrollBar = hScrollBar.value;
    
    if (!$hScrollBar) throw new Error("hScrollBar not found");

    
    // adjust time ofset with mouse middle wheel
    window.addEventListener('wheel', (e) => {
        // view.timeOffset = view.timeOffset - view.pxToTime(e.deltaX);
        view.setTimeOffset(view.timeOffset - view.pxToTime(e.deltaX));
    });
    // make hScrollBar draggable horizontally
    let isDragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;
    $hScrollBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartOffset = view.timeOffset;
    });
    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const delta = e.clientX - dragStartX;
            view.timeOffset = dragStartOffset + view.pxToTime(delta);
            // view.setTimeOffset(dragStartOffset + view.pxToTime(delta));
        }
    });
    window.addEventListener('mouseup', (e) => {
        isDragging = false;
    });
    
});

</script>

<template>
    <div 
        class="scroll" 
        ref="hScrollBar"
        :style="{
            width: '200px',
            left: view.timeToPx(view.timeOffset) + 'px'
        }"
    
    > &nbsp; </div>
</template>

<style scoped>
.scroll {
  background-color: #888;
  border:solid 1px #999;
  height: 11px;
  padding: -1px;
  position: fixed;
  bottom: 0;
  cursor: grab;
}
</style>
