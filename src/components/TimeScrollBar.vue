<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { View } from '../View';

const props = defineProps<{ view: View }>();


const hScrollBar = ref<HTMLDivElement>();

onMounted(()=>{
    const $hScrollBar = hScrollBar.value;
    
    if (!$hScrollBar) throw new Error("hScrollBar not found");

    const view = props.view;

    // make scroll bar draggable horizontally
    let isDragging = false;
    let dragStartX = 0;
    let dragStartTimeOffset = 0;

    // adjust time ofset with mouse middle wheel
    window.addEventListener('wheel', (e) => {
        view.timeOffset -= view.pxToTime(e.deltaX);
    });

    $hScrollBar.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        dragStartX = e.clientX;
        dragStartTimeOffset = view.timeOffset;
        $hScrollBar.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = dragStartX - e.clientX ;
            view.timeOffset = dragStartTimeOffset - view.pxToTime(dx);
            console.log(view.timeOffset);
        }
    });

    window.addEventListener('mouseup', (e) => {
        $hScrollBar.style.cursor = '';
        isDragging = false;
    });
});

</script>

<template>
    <div 
        class="scroll" 
        ref="hScrollBar"
        :style="{
            width: view.timeToPx(32) + 'px',
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
