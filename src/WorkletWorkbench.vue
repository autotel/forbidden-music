<script setup lang="ts">
import { onMounted, reactive, ref, watchEffect } from 'vue';


const samplingRate = 44100; // note its 44100 / 10
const calculatedCutoffs: [number, number][] = [];
const ftCalcs = ref(0);
const frequency = 180
const inputPulseWave = new Array(441).fill(0).map((_, i) => {
    return 1;
    const period = samplingRate / frequency;
    const x = i % period;
    const threshold = period / 2;
    return x < threshold ? 1 : -1;
});

const noiseLen = 440;
const nOrZero = (x: number) => isNaN(x) ? 0 : x;
const sineWindow = (i: number, period: number) => {
    return Math.sin(i / period * Math.PI);
}
const noise = (len: number) => new Array(len).fill(0).map((_, i) => {
    return (Math.random()) *2 - 1;// * sineWindow(i, len);
});

const outputPulseWave = ref(new Array(inputPulseWave.length).fill(0));
const outputNoiseFft = ref(new Array(noiseLen).fill(0));
const errors = ref<string[]>([]);
const testFilterFunctionString = ref(`
arr => {
    class IIRLPFRochars {
        /** @type {Number} */
        rc;
        /** @type {Number} */
        dt;
        /** @type {Number} */
        alpha;
        /** @type {Number} */
        last_val = 0;
        /** @type {Number} */
        offset;
        constructor(cutoff) {
            this.setCutoff(cutoff);
        }
        setCutoff(cutoff) {
            this.rc = 1.0 / (cutoff * 2 * Math.PI);
            this.dt = 1.0 / samplingRate;
            this.alpha = this.dt / (this.rc + this.dt);
        }
        operation = (insample) => {
            this.offset++;
            this.last_val = this.last_val
                + (this.alpha * (insample - this.last_val));
            return this.last_val;
        }
    }

    const lp = new IIRLPFRochars(500);
    return arr.map((x) => {
        return lp.operation(x);
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
let smoothed = new Array(noiseLen).fill(0);
let delta = new Array(noiseLen).fill(0);
let deltaDelta = new Array(noiseLen).fill(0);
let testNoise = noise(noiseLen);
let outNoiseResult: number[] = [];
let ftOfPulse: number[] = [];
let ftOfPulseImaginary: number[] = [];
const calculateDerivate = (arr: number[]) => {
    return arr.map((x, i) => {
        if (i === 0) return 0;
        return (x - arr[i - 1]);
    });
}

const calcFt = () => {
    try {
        const testFilterFunction = eval(testFilterFunctionString.value);
        testNoise = noise(noiseLen);
        outNoiseResult = testFilterFunction([...testNoise]);
        const noiseChange = outNoiseResult.map((x, i) => {
            return (x) - (testNoise[i]);
        });
        ftOfPulse = [...outputPulseWave.value];
        FFT(ftOfPulse, ftOfPulseImaginary);
        // const outNoiseResult: number[] = testFilterFunction(inputPulseWave);
        FFT(noiseChange, outImaginary);
        const weightNew = 1 / (ftCalcs.value + 1);
        const weightOld = 1 - weightNew;
        const outNoiseFtAverage = outNoiseResult.map((x, i) => {
            x = isNaN(x) ? 0 : x;
            return x * weightNew + previousNoiseFft[i] * weightOld;
        });
        previousNoiseFft.splice(0, previousNoiseFft.length, ...outNoiseFtAverage);
        let pValue: number = 0;
        let maxSmoothedValue = 0;
        // cutoff should be at the edges of the delta curves
        delta = calculateDerivate(outputPulseWave.value)
        deltaDelta = calculateDerivate(delta)
        outputNoiseFft.value = outNoiseFtAverage;
        ftCalcs.value++;
    } catch (e: any) {
        errors.value = [e + ""];
    }
    if (ftTimeout.value) clearTimeout(ftTimeout.value);
    ftTimeout.value = setTimeout(calcFt, 90);
}

onMounted(() => {
    if (ftTimeout.value) {
        clearTimeout(ftTimeout.value);
    }
    ftCalcs.value = 0;
    setTimeout(calcFt, 100);
});
watchEffect(() => {
    try {
        const testFilterFunction = eval(testFilterFunctionString.value);
        outputPulseWave.value = testFilterFunction(inputPulseWave);
        ftCalcs.value = 0;
        errors.value = [];
    } catch (e: any) {
        errors.value = [e + ""];
    }
    // error if output is not array
    if (!Array.isArray(outputPulseWave.value)) {
        errors.value.push("output is not an array");
    }
});

const drawHeight = 140;
const halfHeight = drawHeight / 2;

const displays = reactive({
    outNoiseResult: false,
    outputPulseWave: true,
    outputNoiseFft: true,
    delta: true,
    deltaDelta: true,
    ftOfPulse: true,
});

</script>
<template>
    <div class="side-by-side">
        <svg ref="outputDisplay" class="output svg" :viewBox="`0 0 ${inputPulseWave.length} ${drawHeight}`"
            style="width: 50%">
            <line class="zero" x1="0" y1="70" :x2="inputPulseWave.length" y2="70" />
            <text fill="rgba(255,0,0,0.23)" font-size="12" x="0" y="0" dy="1em">precision: {{ ftCalcs }}</text>
            <path v-if="displays.outNoiseResult && outNoiseResult.length > 0" class="output trace"
                :d="`M${outNoiseResult.map((y, x) => `${x},${halfHeight - y * 100}`).join(' ')}`" />
            <path v-if="displays.outputPulseWave && outputPulseWave.length > 0" class="output trace"
                :d="`M${outputPulseWave.map((y, x) => `${x},${halfHeight - y * 100}`).join(' ')}`" />
            <path v-if="displays.outputNoiseFft && outputNoiseFft.length > 0" class="ft output trace"
                :d="`M${outputNoiseFft.map((y, x) => `${nOrZero(x)},${halfHeight - nOrZero(y) * 100}`).join(' ')}`" />
            <path v-if="displays.delta && delta.length > 0" class="deltaft output trace"
                :d="`M${delta.map((y, x) => `${nOrZero(x)},${halfHeight - nOrZero(y) * 100}`).join(' ')}`" />
            <path v-if="displays.deltaDelta && deltaDelta.length > 0" class="deltaft output trace"
                :d="`M${deltaDelta.map((y, x) => `${nOrZero(x)},${halfHeight - nOrZero(y) * 100}`).join(' ')}`" />
            <path v-if="displays.ftOfPulse && ftOfPulse.length > 0" class="ft output trace"
                :d="`M${ftOfPulse.map((y, x) => `${nOrZero(x)},${halfHeight - nOrZero(y) * 100}`).join(' ')}`" />

        </svg>
        <div style="width: 50%; height: 100vh;">
            <textarea v-model="testFilterFunctionString" style="width:100%" ></textarea>
            <input type="checkbox" v-model="displays.outNoiseResult" /> outNoiseResult
            <input type="checkbox" v-model="displays.outputPulseWave" /> outputPulseWave
            <input type="checkbox" v-model="displays.outputNoiseFft" /> outputNoiseFft
            <input type="checkbox" v-model="displays.delta" /> delta
            <input type="checkbox" v-model="displays.deltaDelta" /> deltaDelta
            <input type="checkbox" v-model="displays.ftOfPulse" /> ftOfPulse
        </div>
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

.output.trace.deltaft {
    stroke: rgba(175, 90, 11, 0.575);
}

.err {
    color: red;
    position: absolute;
    bottom: 0;
}
</style>
