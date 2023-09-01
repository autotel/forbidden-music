<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useToolStore } from '../../store/toolStore';

const props = defineProps<{
    x: number,
    y: number,
    tooltip?: string
}>();

const tool = useToolStore();
const body = ref<SVGRectElement>();
const bodyMouseEnterListener = (e: MouseEvent) => {
    if(!props.tooltip) return;
    e.stopImmediatePropagation();
    if (body.value) {
        tool.tooltip = props.tooltip;
        tool.tooltipOwner = body.value;
    }
}
const bodyMouseLeaveListener = (e: MouseEvent) => {
    if(tool.tooltipOwner !== body.value) return;
    e.stopImmediatePropagation();
    tool.tooltip = '';
    tool.tooltipOwner = null;
}

onMounted(() => {
    if (body.value) {
        body.value.addEventListener('mouseenter', bodyMouseEnterListener);
        body.value.addEventListener('mouseleave', bodyMouseLeaveListener);
    }
});
onBeforeUnmount(() => {
    if (body.value) {
        body.value.removeEventListener('mouseenter', bodyMouseEnterListener);
        body.value.removeEventListener('mouseleave', bodyMouseLeaveListener);
    }
});

</script>
<template>
    <rect 
        ref="body"
        :x="x"
        :y="y"
        rx="6"
        ry="6"
        
        width="20" 
        height="20"     
    />
    <text 
    
        :x="x + 10"
        :y="y + 10"
        v-bind="$attrs" 
        text-anchor="middle" 
        dominant-baseline="middle"
        
    >
            <slot />
    </text>
</template>
<style scoped>
    rect {
        fill: rgba(0, 0, 0, 0);
        stroke: #0005;
    }
    text {
        font-size: 20px;
        fill: #0005;
    }
</style>