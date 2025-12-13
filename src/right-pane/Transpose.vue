<script setup lang="ts">
import Button from '@/components/Button.vue';
import UpDown from '@/components/icons/UpDown.vue';
import { Trace, TraceType } from '@/dataTypes/Trace';
import { useSelectStore } from '@/store/selectStore';
import { useToolStore } from '@/store/toolStore';
import Fraction from 'fraction.js';
import Collapsible from './Collapsible.vue';
import { frequencyToOctave, octaveToFrequency } from '@/functions/toneConverters';
import { getFrequency } from '@/dataTypes/Note';
import { TextureMatrix } from 'pixi.js';
import ButtonSub from '@/components/ButtonSub.vue';

const tool = useToolStore();
const selection = useSelectStore();

const multiplyFrequencyBy = (multiplier: number) => {
    selection.selected.forEach((trace: Trace) => {
        if (trace.type !== TraceType.Note) {
            return;
        }
        let f = getFrequency(trace);
        let pf = f;
        const pot = trace.octave;
        f *= multiplier;
        const ot = frequencyToOctave(f);
        trace.octave = ot;
        console.log("multiply", multiplier, pf, f, pot, trace.octave);
    })
}

const fracs = [
    1 / 2, 2,
    2 / 3, 3 / 2,
    3 / 4, 4 / 3,
    4 / 5, 5 / 4,
    5 / 6, 6 / 5,
    8 / 9, 9 / 8,
];
const intervalNames = [
    'octave',
    'fifth',
    'fourth',
    'M third',
    'm third',
    'tone',
];
const isHarmonicSequence = [
    true,
    true,
    false,
    true,
    true,
    true,
];
const intervalNameFor = (index: number) => {
    return intervalNames[Math.floor(index / 2)];
}
const directionFor = (frac: number) => {
    if (frac < 1) {
        return "down"
    } else {
        return "up"
    }
}
const isHarmonicSequenceFor = (index: number) => {
    return isHarmonicSequence[Math.floor(index / 2)];
}
const octaveTraspositions: { [key: string]: number } = {}

fracs.forEach(val => {
    octaveTraspositions[new Fraction(val).toFraction()] = val;
})

</script>

<template>
    <Collapsible tooltip="Move notes up and down">
        <template #icon>
            <UpDown clas="icon" />
            Transpose
        </template>
        <template v-for="([string, value], index) in Object.entries(octaveTraspositions)">
            <Button :onClick="() => multiplyFrequencyBy(value)" :tooltip="`Multiply the frequency by ${string}`"
                :class="{ isHarmonicSequence: isHarmonicSequenceFor(index) }">
                {{ intervalNameFor(index) }} {{ directionFor(value) }} | {{ string }}
            </Button>
        </template>
    </Collapsible>
</template>

<style scoped>
.isHarmonicSequence {
    background-color: rgb(229, 234, 238);
    &:hover{
        background-color: rgb(200, 212, 219);
    }
}
button {
    width: 142px;
}
</style>