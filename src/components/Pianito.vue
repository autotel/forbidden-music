<script setup lang="ts">
import { Ref, ref, watchEffect } from 'vue';
import { useViewStore } from '../store/viewStore';

const view = useViewStore();
const linePositionsPx = ref([]) as Ref<number[]>;
const lineValues = ref([]) as Ref<number[]>;
const isIBlack = [
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
    true,
    false
];

const keyHeight = ref(0);

interface keyRect {
    y: number,
    black: boolean,
    k: string,
}

const keys = ref([] as Array<keyRect>);

watchEffect(() => {
    // let totalOctave = 0;//view.viewHeightOctaves - 0 - view.octaveOffset;
    let index = 0;
    for (let oct = 0; oct < view.viewHeightOctaves; oct++) {
        // totalOctave = oct - (view.viewHeightOctaves + view.octaveOffset);
        // if (totalOctave > topLimit) continue;

        for (let note = 0; note < 12; note++) {
            console.log(index);
            // console.log(index);
            keys.value[index] = {
                y: view.octaveToPxWithOffset(index / 12) % view.viewHeightPx,
                black: isIBlack[note],
                k: index + (isIBlack[note] ? "b" : ""),
            };
            index++;
        }
    }
    keys.value.splice(index);
    // console.log(view.octaveOffset);
});

watchEffect(() => {
    keyHeight.value = view.octaveToPx(-1 / 12) - 2;
});

</script>
<template>
    <svg id="pianito">
        <template v-for="key in keys">
            <rect :fill="key.black ? 'black' : 'white'" stroke-width="1px" x="0" :y="key.y" width="40"
                :height="keyHeight" />
        </template>
    </svg>
</template>
<style scoped>
#pianito {
    position: fixed;
    left: 0;
    top: 0;
    height: 100%;
    width: 2rem;
    background-color: black;
    opacity: 0.4;
}
</style>