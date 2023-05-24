<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useViewStore } from '../store/viewStore';
const octavesHeight = 8;
const view = useViewStore();
const eightOctavesHeight = ref(0);
const topOctavePosition = ref(0);
const posUpdate = () => {
    eightOctavesHeight.value = Math.abs(view.octaveToPx(octavesHeight + (1/24))); /// the offset is so that it aligns to the center of the note
    topOctavePosition.value = view.octaveToPxWithOffset(octavesHeight);
}

watch(view,posUpdate);
onMounted(posUpdate);


const keyboardHtml = (()=>{
    
    const isIBlack = [
    
        false,
        true,
        false,
        true,
        false,
        true,
        false,

        false,
        true,
        false,
        true,
        false,
    ];
    const octaves = 8;
    const keyRect = (note:number,w:number) => {
        const black = isIBlack[note%12];
        return `<rect x="-5" y="${note}" width="10" height="1" fill="${black?"black":"white"}"></rect>`;
    }
    const octave = (octave:number) => {
        const octaveRects = [];
        for(let i=0;i<12;i++) {
            octaveRects.push(keyRect(i+octave*12,10));
        }
        return octaveRects.join('');
    }
    const octavesHtml = (()=>{
        const octavesHtml = [];
        for(let i=0;i<octaves;i++) {
            octavesHtml.push(octave(i));
        }
        return octavesHtml.join('');
    })();
    return `${octavesHtml}`;
})();

</script>
<template>
    <svg id="pianito" :viewBox="`0 0 1 ${12*octavesHeight}`" :style="`top:${topOctavePosition}px; height:${eightOctavesHeight}px`" v-html="keyboardHtml">
    </svg>
</template>
<style scoped>
#pianito {
    position: fixed;
    left: 0;
    top: 0;
    width: 2rem;
    /* background-color: black; */
    opacity: 0.4;
    border:1px solid black
}
#pianito *{
    stroke: black;
    stroke-width: 1;
}
</style>