<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue';


const samplingRate = 44100; // note its 44100 / 10


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
    return (Math.random() ) * sineWindow(i, len);
});
const outputWave = ref(new Array(inputSquareWave.length).fill(0));
const outputNoiseFft = ref(new Array(noiseLen).fill(0));
const errors = ref<string[]>([]);
const testFilterFunctionString = ref(`arr => {
    const samplingRate = 44100;
    const clip = (x) => {
        return Math.max(-1, Math.min(1, x));
    }
    class LpMoog {
        constructor(frequency, reso) {
            let msgcount = 0;
            let in1, in2, in3, in4, out1, out2, out3, out4
            in1 = in2 = in3 = in4 = out1 = out2 = out3 = out4 = 0.0;

            this.reset = () => {
                in1 = in2 = in3 = in4 = out1 = out2 = out3 = out4 = 0.0;
                msgcount = 0;
            }
            let f, af, sqf, fb;
            this.set = (frequency, reso) => {
                this.reset();
                if (frequency < 0) frequency = 0;
                f = (frequency / samplingRate) * 1.16;

                af = 1 - f;
                sqf = f * f;

                fb = reso * (1.0 - 0.15 * sqf);
            }

            this.operation = (sample, saturate = false) => {

                let outSample = 0;
                sample -= out4 * fb;
                sample *= 0.35013 * (sqf) * (sqf);

                out1 = sample + 0.3 * in1 + af * out1; // Pole 1
                in1 = sample;
                out2 = out1 + 0.3 * in2 + af * out2; // Pole 2
                in2 = out1;
                out3 = out2 + 0.3 * in3 + af * out3; // Pole 3
                in3 = out2;
                out4 = out3 + 0.3 * in4 + af * out4; // Pole 4
                in4 = out3;

                outSample = out4;

                return saturate ? clip(outSample) : outSample;
            }
            this.set(frequency, reso);
        }
    }

    const lp = new LpMoog(4400, 0.5);
    return arr.map((x) => {



        return lp.operation(x, true);
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
        const outNoiseResult: number[] = testFilterFunction(testNoise);
        const noiseChange = outNoiseResult.map((x, i) => {
            return nOrZero(x) - nOrZero(previousNoiseFft[i]);
        });
        // const outNoiseResult: number[] = testFilterFunction(inputSquareWave);
        FFT(noiseChange, outImaginary);
        const weightNew = 0.1;
        const weightOld = 1 - weightNew;
        const outNoiseFtAverage = outNoiseResult.map((x, i) => {
            x = isNaN(x) ? 0 : x;
            return x * weightNew + previousNoiseFft[i] * weightOld;
        });
        previousNoiseFft.splice(0, previousNoiseFft.length, ...outNoiseFtAverage);

        outputNoiseFft.value = previousNoiseFft;
        // console.log("ft");
    } catch (e: any) {
        errors.value = [e + ""];
    }
    if (ftTimeout.value) clearTimeout(ftTimeout.value);
    ftTimeout.value = setTimeout(calcFt, 10);
}
setTimeout(calcFt, 100);

onMounted(() => {
    if (ftTimeout.value) {
        console.log("clear");
        clearTimeout(ftTimeout.value);
    }
});
watchEffect(() => {
    try {
        const testFilterFunction = eval(testFilterFunctionString.value);
        outputWave.value = testFilterFunction(inputSquareWave);
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
