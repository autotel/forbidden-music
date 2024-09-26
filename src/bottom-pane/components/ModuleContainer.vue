<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';
import Eye from '@/components/icons/Eye.vue';
import EyeNot from '@/components/icons/EyeNot.vue';

type DragCallbackType = (e: MouseEvent) => void;

const props = defineProps<{
    title: string,
    padding?: boolean
    noCollapse?: boolean
    defaultCollapsed?: boolean
    dragStartCallback?: DragCallbackType
    dragEndCallback?: DragCallbackType
}>();

const dragHandleEl = ref<HTMLElement | null>(null);
const collapsed = ref(false);
const mainContainer = ref<HTMLDivElement | null>(null);
const collapsible = ref(true);
const originalModuleWidth = ref<string>('16em');
const isDraggable = computed<[DragCallbackType, DragCallbackType] | false>(() => {
    if (props.dragStartCallback && props.dragEndCallback) {
        return [props.dragStartCallback, props.dragEndCallback];
    }
    return false;
});

const dragStarted = ref<boolean>(false);

watchEffect(() => {
    collapsible.value = !props.noCollapse;
    collapsed.value = props.defaultCollapsed ?? false;
});

const toggleCollapse = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.noCollapse) return;
    collapsed.value = !collapsed.value;
}

const dragStartHandler = (e: MouseEvent) => {
    dragStarted.value = true;
    addEventListener('mousemove', dragMoveHandler);
    dragMoveHandler(e);
    originalModuleWidth.value = mainContainer.value?.clientWidth + 'px';
}

const dragEndHandler = () => {
    dragStarted.value = false;
    removeEventListener('mousemove', dragMoveHandler);
    mainContainer.value?.removeAttribute('style');
}

const dragMoveHandler = (e: MouseEvent) => {
    if (dragStarted.value) {
        const x = e.clientX - 20;
        const y = e.clientY - 80;
        mainContainer.value?.setAttribute('style', `left: ${x}px; top: ${y}px;`);
    }
}

onMounted(() => {
    const dCallbacks = isDraggable.value;
    if (dCallbacks) {
        const [dragStartCallback, dragEndCallback] = dCallbacks;

        dragHandleEl.value?.addEventListener('mousedown', dragStartCallback);
        addEventListener('mouseup', dragEndCallback);
        dragHandleEl.value?.addEventListener('mousedown', dragStartHandler);
        addEventListener('mouseup', dragEndHandler);
    }
});

onBeforeUnmount(() => {
    const dCallbacks = isDraggable.value;
    if (dCallbacks) {
        const [dragStartCallback, dragEndCallback] = dCallbacks;

        dragHandleEl.value?.removeEventListener('mousedown', dragStartCallback);
        removeEventListener('mouseup', dragEndCallback);
        dragHandleEl.value?.removeEventListener('mousedown', dragStartHandler);
        removeEventListener('mouseup', dragEndHandler);
    }
});

</script>

<template>
    <div v-if="dragStarted" class="flying-module-spacer" :style="{width: originalModuleWidth}">

    </div>
    <div ref="mainContainer" :class="`module-container ${dragStarted ? 'flying' : ''}`">
        <div id="title-rotator">
            <div id="title">
                <span>
                    {{ title }}
                </span>
                <div id="icons-slot-container">
                    <span 
                        v-if="isDraggable"
                        class="click-icon" ref="dragHandleEl" :class="{
                            draggable: isDraggable,
                            active: dragStarted
                        }"
                    >
                        ⁙
                    </span>
                    <span class="click-icon" v-if="collapsible" :onClick="toggleCollapse">
                        <span v-if="collapsed">
                            <Eye />
                        </span>
                        <span v-else>
                            <EyeNot />
                        </span>
                    </span>
                    <slot name="icons"></slot>
                </div>
            </div>

        </div>
        <div id="slot-container" :class="{ padding: padding && !collapsed }">
            <template v-if="!collapsed">
                <slot></slot>
            </template>
        </div>
    </div>
</template>
<style scoped>
#slot-container {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: center;
    height: 100%;
}

.padding {
    padding: 0.2em;
    /* margin: 0.3em; */
}

.module-container {
    display: flex;
    flex-direction: row;
    height: 18em;
    padding-left: 2em;
    background-color: #92909b80;
    border: 1px solid #aaac;
    border-radius: 1em;
    box-sizing: border-box;
    /* overflow: hidden; */
    position: relative;
    user-select: none;
}

.module-container.flying {
    position: fixed;
    z-index: 5;
    box-shadow: 2px 2px 8px #0000002f;
    /* transform: rotate3d(10,80, 0, 45deg); */
    opacity: 0.8;
    pointer-events: none;
}

.draggable {
    cursor: grab;
}

.draggable.active {
    cursor: grabbing;
}

#title {
    position: absolute;
    bottom: 0.8em;
    transform-origin: left top;
    transform: translate(0, 100%) rotate(-90deg);
    /* nowrap */
    white-space: nowrap;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 16.5em;
    height: 0.9em;
}

#icons-slot-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    height: 100%;
}

.click-icon {
    cursor: pointer;
    margin-left: 0.5em;
    opacity: 0.5;
}

.click-icon svg {
    position: relative;
    top: 2px
}

.click-icon:hover {
    opacity: 1;
}

#title-rotator {
    position: absolute;
    top: -0.6em;
    left: 0.05em;
    width: 1.6em;
    height: 100%;
    margin: 0.6em;
    box-sizing: border-box;
}

@media (prefers-color-scheme: light) {
    .module-container {
        background-color: #e4e4e4;
    }
}

.flying-module-spacer {
    box-shadow: inset 4px 4px 8px #0000001e;
    height: 18em;
    padding-left: 2em;
    border-radius: 1em;
    box-sizing: border-box;
    position: relative;
    background-color: #0001;
}
</style>