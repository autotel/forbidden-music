<script setup lang="ts">
import { start } from 'repl';
import { ref, watchEffect } from 'vue';

const startTween = (subjectRef:{value:number}, destination: {value:number}, duration: number) => {
    const startTime = Date.now();
    const startValue = subjectRef.value;
    const endValue = destination.value;
    let returnObj = {
        frameRequest: 0 as ReturnType<typeof requestAnimationFrame> | 0,
        cancel: () => {
            cancelAnimationFrame(returnObj.frameRequest);
        }
    };
    const tween = () => {
        const time = Date.now();
        const progress = (time - startTime) / duration;
        if(progress >= 1) {
            subjectRef.value = endValue;
            return;
        }
        subjectRef.value = startValue + (endValue - startValue) * progress;
        returnObj.frameRequest = requestAnimationFrame(tween);
    }
    returnObj.frameRequest = requestAnimationFrame(tween);
    return returnObj;
}

const props = defineProps<{
    on?: boolean
    vertical?: boolean
}>()

let lerpedValue = ref(0);
let currentTween = startTween(lerpedValue, {value:props.on?1:0}, 0);

watchEffect(() => {
    if(props.on) {
        currentTween.cancel();
        currentTween = startTween(lerpedValue, {value:1}, 30)
    } else {
        currentTween.cancel();
        currentTween = startTween(lerpedValue, {value:0}, 30)
    }
})

</script>
<template>
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        style="height: 1.2em; width: 1.2em; top: 0.2em; position: relative;"
        viewBox="0 -960 960 960" 
        :class="{vertical}"
    >
        <path 
            fill="currentColor"
            :d="`M280-240q-100 0-170-70T40-480q0-100 70-170t170-70h400q100 0 170 70t70 170q0 100-70 170t-170 70H280Zm0-80h400q66 0 113-47t47-113q0-66-47-113t-113-47H280q-66 0-113 47t-47 113q0 66 47 113t113 47Zm${lerpedValue*400}-40q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm480-480Z`"
        />
    </svg>
</template>
<style>
    .vertical {
        transform: rotate(-90deg);
    }
</style>