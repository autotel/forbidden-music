<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useViewStore } from '../store/viewStore';


const view = useViewStore();

const hScrollBar = ref<HTMLDivElement>();

onMounted(() => {
    const $hScrollBar = hScrollBar.value;
    // const $resize = resize.value;

    if (!$hScrollBar) throw new Error("hScrollBar not found");
    // if (!$resize) throw new Error("resize not found");

    // make hScrollBar draggable horizontally
    let isPanning = false;
    let isResizing = false;
    let dragStartX = 0;
    // let dragStartOffset = 0;
    let dragStartBounds = 0;
    let dragStartViewWidthTime = 0;

    $hScrollBar.addEventListener('mousedown', (e) => {
        e.stopImmediatePropagation();
        isPanning = true;
        isResizing = false;
        dragStartX = e.clientX;
        // dragStartOffset = view.timeOffset;
        dragStartBounds = view.timeToBounds(view.timeOffset);
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning && !isResizing) return;
        const delta = (e.clientX - dragStartX);
        if (isPanning) {
            e.preventDefault();
            view.setTimeOffsetBounds(dragStartBounds + view.pxToBounds(delta));
            if (view.timeOffset < 0) {
                view.timeOffset = 0;
            }
            if (view.timeOffset > view.scrollBound - view.viewWidthTime) {
                view.timeOffset = view.scrollBound - view.viewWidthTime;
            }
        } else if (isResizing) {
            e.preventDefault();

            view.viewWidthTime = dragStartViewWidthTime
                + (view.pxToBounds(delta)) * view.viewWidthPx;
            if (view.viewWidthTime < 1) {
                view.viewWidthTime = 1;
            }
            if (view.viewWidthTime > 40) {
                view.viewWidthTime = 40;
            }
        }
    }, { passive: false });
    window.addEventListener('mouseup', (e) => {
        isPanning = false;
        isResizing = false;
    });

});

</script>

<template>
    <div style="position:absolute; width:100%;">
        <div class="scroll" ref="hScrollBar" :style="{
            width: 100 / view.timeToPx(0.1) + '%',
            // width: view.timeToBounds(view.viewWidthTime) * 100 + '%',
            left: view.timeToBounds(view.timeOffset) * 100 + '%'
        }">
        </div>
    </div>
</template>

<style scoped>
.scroll {
    background-color: #dfdfdf46;
    height: 11px;
    padding: -1px;
    position: absolute;
    bottom: 0;
    cursor: grab;
}

.resize {
    position: absolute;
    right: 0px;
    top: 0px;
    width: 11px;
    height: 11px;
    background-color: black;
    cursor: ew-resize;
}
</style>
