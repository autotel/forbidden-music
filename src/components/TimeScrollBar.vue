<script setup lang="ts">
import { Store } from 'pinia';
import { onMounted, ref } from 'vue'
import { useViewStore } from '../store/viewStore';


const view = useViewStore();

const hScrollBar = ref<HTMLDivElement>();

onMounted(()=>{
    const $hScrollBar = hScrollBar.value;
    
    if (!$hScrollBar) throw new Error("hScrollBar not found");

    // make hScrollBar draggable horizontally
    let isDragging = false;
    let dragStartX = 0;
    // let dragStartOffset = 0;
    let dragStartBounds = 0;

    $hScrollBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        // dragStartOffset = view.timeOffset;
        dragStartBounds = view.timeToBounds(view.timeOffset);
    });


    window.addEventListener('mousemove', (e) => {
        e.preventDefault();
        if (isDragging) {
            const delta = (e.clientX - dragStartX);
            // view.timeOffset = dragStartOffset + view.timeToPx(delta);
            view.setTimeOffsetBounds(dragStartBounds + view.pxToBounds(delta));
            // prevent timeOffset from going out of bounds
            if (view.timeOffset < 0) {
                view.timeOffset = 0;
            }
            if (view.timeOffset > view.scrollBound - view.viewWidthTime) {
                view.timeOffset = view.scrollBound - view.viewWidthTime;
            }
        }
    }, { passive: false });
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
            width: 100 / view.timeToPx(0.1) + '%',
            // width: view.timeToBounds(view.viewWidthTime) * 100 + '%',
            left: view.timeToBounds(view.timeOffset) * 100 + '%'
        }"
    > &nbsp; </div>
</template>

<style scoped>
.scroll {
  background-color: #dfdfdf;
  height: 11px;
  padding: -1px;
  position: fixed;
  bottom: 42px;
  cursor: grab;
}
</style>
