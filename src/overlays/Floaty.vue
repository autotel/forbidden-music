<script setup lang="ts">
import { watch } from 'fs';
import { start } from 'repl';
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';

const props = defineProps<{
    x?: number,
    y?: number,
    width?: number,
    height?: number
}>()
const emits = defineEmits<{
    (e: 'resize', size: { width: number, height: number }): void
    (e: 'move', pos: { x: number, y: number }): void
}>()
const dragHandle = ref<HTMLElement | null>(null);

const box = ref({
    x: props.x || 0,
    y: props.y || 0,
    width: props.width || 100,
    height: props.height || 100
});

watchEffect(() => {
    box.value.x = props.x || 0;
    box.value.y = props.y || 0;
    box.value.width = props.width || 100;
    box.value.height = props.height || 100;
});

const mouse = ref({
    dragStarted: { x: 0, y: 0 },
    positionWhenDragStarted: { x: 0, y: 0 },
    sizeWhenDragStarted: { width: 0, height: 0 },
    moving: false,
    resizing: false,
})

const startDR = (e: MouseEvent) => {
    mouse.value.dragStarted = { x: e.clientX, y: e.clientY };
    mouse.value.positionWhenDragStarted = { x: box.value.x, y: box.value.y };
    mouse.value.sizeWhenDragStarted = { width: box.value.width, height: box.value.height };
}
const startDrag = (e: MouseEvent) => {
    mouse.value.moving = true;
    startDR(e);
}
const startResize = (e: MouseEvent) => {
    mouse.value.resizing = true;
    startDR(e);
}

const drag = (e: MouseEvent) => {
    const delta = {
        x: e.clientX - mouse.value.dragStarted.x,
        y: e.clientY - mouse.value.dragStarted.y
    }
    if (mouse.value.moving) {
        box.value.x = mouse.value.positionWhenDragStarted.x + delta.x;
        box.value.y = mouse.value.positionWhenDragStarted.y + delta.y;
        emits('move', { x: box.value.x, y: box.value.y });
    }
    if (mouse.value.resizing) {
        box.value.width = mouse.value.sizeWhenDragStarted.width + delta.x;
        box.value.height = mouse.value.sizeWhenDragStarted.height + delta.y;
        emits('resize', { width: box.value.width, height: box.value.height });
    }
}

const stopDrag = () => {
    mouse.value.moving = false;
    mouse.value.resizing = false;
}

onMounted(() => {
    window.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', stopDrag);
});
onBeforeUnmount(() => {
    window.removeEventListener('mousemove', drag);
    window.removeEventListener('mouseup', stopDrag);
});
const boxPx = computed(()=> {
    const bVal = box.value;
    return {
        left: bVal.x + 'px',
        top: bVal.y + 'px',
        width: bVal.width + 'px',
        height: bVal.height + 'px'
    }
});
</script>
<template>
    <div style="backdrop-filter: blur(5px); position:absolute" :style="boxPx">
        <div ref="dragHandle" @mousedown="startDrag" class="dragHandle" :class="{
            dragging: mouse.moving,
        }">
        </div>
        <slot></slot>
        <div class="wh-drag" @mousedown="startResize"></div>
    </div>

</template>
<style scoped>
.dragHandle {
    cursor: grab;

    width: 100%;
    height: 0.7em;
    position: absolute;
    padding-top: 40px;
    background-color: rgb(220, 207, 255);
    mix-blend-mode: multiply;

}

.dragHandle.dragging {
    cursor: grabbing;
}

.wh-drag {
    width: 1em;
    height: 1em;
    position: absolute;
    bottom: -0.5em;
    right: -0.5em;
    fill: white;
    border: solid 1px;
    cursor: nwse-resize
}
</style>
