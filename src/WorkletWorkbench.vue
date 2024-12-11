<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue';
import Floaty from './overlays/Floaty.vue';

type ExpectedFnReturn = {
    [key: string]: number[]
}

const scopedEval = (scope: Object, script: string): () => ExpectedFnReturn => (eval(`"use strict"; ${script}`).bind(scope));

const fn = (fn: (i: number) => number, size: number) => {
    let ret = [];
    try {
        for (let i = 0; i < size; i++) {
            const resp = fn(i);
            if (isNaN(resp)) {
                throw new Error(`Function returned NaN at ${i}`);
            }
            ret.push(fn(i));
        }
    } catch (e) {
        throw new Error(`Error in function: ${e}`);
    }
    return ret;
}

const nOrZero = (x: number) => isNaN(x) ? 0 : x;

const sineWindow = (i: number, period: number) => {
    return Math.sin(i / period * Math.PI);
}
const noise = (len: number) => new Array(len).fill(0).map((_, i) => {
    return (Math.random()) * 2 - 1;// * sineWindow(i, len);
});
const calculateDerivate = (arr: number[]) => {
    return arr.map((x, i) => {
        if (i === 0) return 0;
        return (x - arr[i - 1]);
    });
}

/**
 * https://gist.github.com/mbitsnbites/a065127577ff89ff885dd0a932ec2477
 * */
const FFT = (x_re: number[], x_im: number[]) => {
    var m = x_re.length / 2, k, X_re = [], X_im = [], Y_re = [], Y_im = [],
        a, b, tw_re, tw_im;

    for (k = 0; k < m; ++k) {
        X_re[k] = x_re[2 * k];
        X_im[k] = x_im[2 * k];
        Y_re[k] = x_re[2 * k + 1];
        Y_im[k] = x_im[2 * k + 1];
    }

    if (m > 1) {
        FFT(X_re, X_im);
        FFT(Y_re, Y_im);
    }

    for (k = 0; k < m; ++k) {
        a = -Math.PI * k / m, tw_re = Math.cos(a), tw_im = Math.sin(a);
        a = tw_re * Y_re[k] - tw_im * Y_im[k];
        b = tw_re * Y_im[k] + tw_im * Y_re[k];
        x_re[k] = X_re[k] + a;
        x_im[k] = X_im[k] + b;
        x_re[k + m] = X_re[k] - a;
        x_im[k + m] = X_im[k] - b;
    }
    return [
        x_re, x_im
    ];
}

const colorWaves = ref<ExpectedFnReturn>({});
const graphLen = ref(44100);
const errors = ref<string[]>([]);
// const plotFn = ref(`
// () => {
//     const size = 4410
//     const red = fn((sn) => {
//         return Math.sin(sn * Math.PI * 2)
//     },size)

//     const green = noise(size)

//     const crimson = FFT(red, new Array(size).fill(0))[0].map(nOrZero)

//     const teal = FFT(green, new Array(size).fill(0))[0].map(nOrZero)

//     return {
//         red, green, crimson, teal,
//     };
// }
// `);
//@ts-nocheck
const plotFn = ref(
    (() => {
        const size = 4410
        const red = fn((sn) => {
            const t = 1 + 5 * sn / size;
            return Math.sin(sn * Math.PI * 10 / size) * t
        }, size)
        const orange = [0];
        const green = [0];
        const teal = [0];


        const white = red.map(sample => {
            const off1 = sample + 1;
            const invert = -(
                (Math.floor(Math.abs(off1/2)) % 2) * 2 - 1
            );
            if (off1 > 1) {
                return invert * (2 * ((off1 / 2) % 1) - 1);
            } else if (off1 < 0) {
                return invert * (2 * -((off1 / 2) % 1) - 1);
            }
            return sample;
        })

        return {
            red, white, orange, green, teal
        };
    }).toString());
onMounted(() => {
});
watchEffect(() => {
    colorWaves.value = {};
    try {
        const testFn = scopedEval({
            FFT, noise, sineWindow, calculateDerivate, nOrZero, fn
        }, plotFn.value);
        console.log("Function", testFn);
        colorWaves.value = testFn();
        console.log("evaluates as ", testFn());
        graphLen.value = Object.keys(colorWaves.value).reduce((acc, key) => {
            return Math.max(acc, colorWaves.value[key].length);
        }, 0);
        errors.value = [];
    } catch (e: any) {
        errors.value = [e + ""];
    }

});

const drawHeight = 140;
const halfHeight = drawHeight / 2;

const keys = computed(() => Object.keys(colorWaves.value));
const codeTextarea = ref<HTMLTextAreaElement | null>(null);
const floatyWidth = computed(() => {
    return codeTextarea.value ? codeTextarea.value.clientWidth : 100;
});

</script>
<template>
    <div class="container">
        <svg ref="plot-container" class="output-svg" :viewBox="`0 0 ${graphLen} ${drawHeight}`">
            <line class="zero" x1="0" :y1="halfHeight" :x2="graphLen" :y2="halfHeight" stroke="white"
                stroke-width="1" />
            <template v-if="colorWaves" v-for="graphColor in Object.keys(colorWaves)">
                <path v-if="colorWaves[graphColor].length > 0" class="output trace" :stroke="graphColor"
                    stroke-width="4"
                    :d="`M${colorWaves[graphColor].map((v, i) => `${i},${halfHeight - v * drawHeight}`).join(' ')}`" />
            </template>

        </svg>
        <Floaty :x="0" :y="0" :width="floatyWidth" :height="20">
            <div class="config-container">
                <textarea ref="codeTextarea" v-model="plotFn"></textarea>
            </div>
        </Floaty>
    </div>
    <p class="err" v-if="errors.length > 0">{{ errors.join('\n') }}</p>
</template>

<style scoped>
.output-svg {
    position: relative;
    width: 100%;
    height: 100%;
    background-color: black;
}

.config-container {
    position: absolute;
    bottom: 0;
    left: 0;
    background-color: white;
    display: flex;
    width: 100%;
    height: calc(100% - 20px);
    top: 20px;
}

.config-container textarea {
    display: inline;

    resize: none;
    width: 100%;
    height: 100%;
}

.zero {
    stroke: rgba(255, 255, 255, 0.397);
}

.frequencyLine {
    stroke: rgba(255, 255, 255, 0.397);
    fill: none;
}

.frequencyText {
    fill: rgba(255, 255, 255, 0.397);
    font-size: 10px;
}

.container {
    width: 100vw;
    height: 100vh;
}

.output.svg {
    background-color: black;
}

.output.trace {
    fill: none;
}

.err {
    color: red;
    position: absolute;
    bottom: 0;
}
</style>
