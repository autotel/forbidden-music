<script setup lang="ts">
import { computed } from 'vue';
import { AutomationPoint } from '../../dataTypes/AutomationPoint';
import { Tool } from '../../dataTypes/Tool';
import { useToolStore } from '../../store/toolStore';
import { TimelineDot, useViewStore } from '../../store/viewStore';


const view = useViewStore();
const tool = useToolStore();
const props = defineProps<{
    circle: TimelineDot<AutomationPoint>
    nextCircle?: TimelineDot<AutomationPoint> | undefined
}>();
const xy1 = computed(() => {
    const circle = props.circle;
    const nextCircle = props.nextCircle;
    let ret = {
        x1: circle.cx,
        y1: circle.cy,
        x2: 0,
        y2: 0,
    }
    if (nextCircle) {
        ret = {
            ...ret,
            x2: nextCircle.cx,
            y2: nextCircle.cy,
        }
    }
    return ret;
});

const text1 = computed(()=>(''+props.circle.event.value).split('.')[0]);
const text2 = computed(()=>(''+props.circle.event.value).split('.')[1]); 

</script>
<template>
    <template v-if="tool.current === Tool.Modulation">
        <text :x="xy1.x1" :y="xy1.y1" v-bind="$attrs" >{{ text1 }}.</text>
        <text :x="xy1.x1+ 12" :y="xy1.y1 " font-size="0.6em" v-bind="$attrs" >{{ text2 }}</text>

        <line v-if="nextCircle" v-bind="xy1" class="veloline" :class="{
            selected: circle.event.selected,
        }" />
        <circle :cx="xy1.x1" :cy="xy1.y1" r="7" :class="{
            selected: circle.event.selected,
        }" v-bind="$attrs" />
    </template>
</template>
<style scoped>
line,
circle {
    stroke: rgba(253, 152, 0, 0.5);
    fill: #0000;
}


line.selected,
circle.selected {
    stroke: rgb(253, 152, 0);
    stroke-width: 3px;
}
</style>
