<script setup lang="ts">
import { Store } from 'pinia';
import { onMounted, ref } from 'vue'
import { useViewStore } from '../store/viewStore';


const view = useViewStore();

const hScrollBar = ref<HTMLDivElement>();

onMounted(()=>{
    const $hScrollBar = hScrollBar.value;
    
    if (!$hScrollBar) throw new Error("hScrollBar not found");

    
    // adjust time ofset with mouse middle wheel
    window.addEventListener('wheel', (e) => {
        view.viewWidthTime **= 1 + e.deltaY / 1000;
        view.viewHeightOctaves **= 1 + e.deltaY / 1000;
        // prevent viewWidthTime from going out of bounds
        if (view.viewWidthTime < 0.1) {
            view.viewWidthTime = 0.1;
        }
    });
    // make hScrollBar draggable horizontally
    let isDragging = false;
    let dragStartX = 0;
    // let dragStartOffset = 0;
    let dragStartBounds = 0;

    $hScrollBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        // dragStartOffset = view.timeOffset;
        dragStartBounds = view.timeToBounds(view.timeOffset) * 20000;
    });


    window.addEventListener('mousemove', (e) => {
        e.preventDefault();
        if (isDragging) {
            const delta = e.clientX - dragStartX;
            // view.timeOffset = dragStartOffset + view.timeToPx(delta);
            view.setTimeOffsetBounds(dragStartBounds / 20000 + view.pxToBounds(delta));
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
            width: -view.timeToPx(-32) + 'px',
            // width: view.timeToBounds(view.viewWidthTime) * 100 + '%',
            left: view.timeToBounds(view.timeOffset) * 100 + '%'
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
