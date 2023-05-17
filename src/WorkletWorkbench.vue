<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue';


const samplingRate = 44100; // note its 44100 / 10

const ftCalcs = ref(0);
const frequency = 180
const inputSquareWave = new Array(441).fill(0).map((_, i) => {
    const period = samplingRate / frequency;
    const x = i % period;
    // return Math.sin(x / period * 2 * Math.PI);
    const threshold = period / 2;
    return x < threshold ? 1 : -1;
});

const noiseLen = 440;
const nOrZero = (x: number) => isNaN(x) ? 0 : x;
const sineWindow = (i: number, period: number) => {
    return Math.sin(i / period * Math.PI);
}
const noise = (len: number) => new Array(len).fill(0).map((_, i) => {
    return (Math.random());// * sineWindow(i, len);
});

const outputWave = ref(new Array(inputSquareWave.length).fill(0));
const outputNoiseFft = ref(new Array(noiseLen).fill(0));
const errors = ref<string[]>([]);
const testFilterFunctionString = ref(`arr => {
    class LpBoxcar {
        constructor(k) {
            let mem = 0;
            this.operation = (x) => {
                mem = k * x + (1 - k) * mem;
                return mem;
            }
        }
    }

    const lp = new LpBoxcar(0.01);
    return arr.map((x) => {
        return x-lp.operation(x);
    })
}`);
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
}

const previousNoiseFft = [...outputNoiseFft.value];
const ftTimeout = ref<any>(0);
const outImaginary = new Array(noiseLen).fill(0);
const calcFt = () => {
    try {
        const testFilterFunction = eval(testFilterFunctionString.value);
        const testNoise = noise(noiseLen);
        const outNoiseResult: number[] = testFilterFunction([...testNoise]);
        const noiseChange = outNoiseResult.map((x, i) => {
            return (x) - (testNoise[i]);
        });
        // const outNoiseResult: number[] = testFilterFunction(inputSquareWave);
        FFT(noiseChange, outImaginary);
        const weightNew = 1 / (ftCalcs.value + 1);
        const weightOld = 1 - weightNew;
        const outNoiseFtAverage = outNoiseResult.map((x, i) => {
            x = isNaN(x) ? 0 : x;
            return x * weightNew + previousNoiseFft[i] * weightOld;
        });
        previousNoiseFft.splice(0, previousNoiseFft.length, ...outNoiseFtAverage);

        outputNoiseFft.value = outNoiseFtAverage;
        // console.log("ft");
        ftCalcs.value++;
    } catch (e: any) {
        errors.value = [e + ""];
    }
    if (ftTimeout.value) clearTimeout(ftTimeout.value);
    ftTimeout.value = setTimeout(calcFt, 90);
}

onMounted(() => {
    if (ftTimeout.value) {
        console.log("clear");
        clearTimeout(ftTimeout.value);
    }
    ftCalcs.value = 0;
    setTimeout(calcFt, 100);
});
watchEffect(() => {
    try {
        const testFilterFunction = eval(testFilterFunctionString.value);
        outputWave.value = testFilterFunction(inputSquareWave);
        ftCalcs.value = 0;
        errors.value = [];
    } catch (e: any) {
        errors.value = [e + ""];
    }
    // error if output is not array
    if (!Array.isArray(outputWave.value)) {
        errors.value.push("output is not an array");
    }
});

</script>
<template>
    <div class="side-by-side">
        <svg ref="outputDisplay" class="output svg" :viewBox="`0 0 ${inputSquareWave.length} 140`" style="width: 50%">
            <line class="zero" x1="0" y1="70" :x2="inputSquareWave.length" y2="70" />
            <text fill="rgba(255,0,0,0.23)" font-size="12" x="0" y="0" dy="1em">precision: {{ftCalcs}}</text>
            <path v-if="outputWave && outputWave.length > 0" class="output trace"
                :d="`M${outputWave.map((y, x) => `${x},${y * 100 + 70}`).join(' ')}`" />
            <path v-if="outputNoiseFft && outputNoiseFft.length > 0" class="ft output trace"
                :d="`M${outputNoiseFft.map((y, x) => `${nOrZero(x)},${nOrZero(y) * 100 + 70}`).join(' ')}`" />
        </svg>
        <textarea v-model="testFilterFunctionString" style="width: 50%; height: 100vh;"></textarea>
    </div>
    <p class="err" v-if="errors.length > 0">{{ errors.join('\n') }}</p>
</template>

<style scoped>
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

.side-by-side {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
}

.output.svg {
    background-color: black;
}

.output.trace {
    stroke: rgba(108, 240, 0, 0.658);
    fill: none;
}

.output.trace.ft {
    stroke: rgba(255, 255, 255, 0.397);
}

.err {
    color: red;
    position: absolute;
    bottom: 0;
}
</style>
