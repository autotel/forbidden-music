<script setup lang="ts">
import Button from '../components/Button.vue';
import Magnet from "../components/icons/Magnet.vue";
import Pen from "../components/icons/Pen.vue";
import { SnapType, useSnapStore } from '../store/snapStore';
import Collapsible from './Collapsible.vue';

import { useMonoModeInteraction } from '../store/monoModeInteraction';
import { useViewStore } from '../store/viewStore';
import { computed, ref } from 'vue';
import { useProjectStore } from '../store/projectStore';
import { EditNote } from '../dataTypes/EditNote';
const snap = useSnapStore();
const monoModeInteraction = useMonoModeInteraction();
const view = useViewStore();
const project = useProjectStore();

const probe = <T>(value: T) => {
    console.log(value);
    return value;
}

const highestEvent = ref<EditNote | undefined>(undefined);

const lowestEvent = computed<EditNote | undefined>(() => {
    const use = view.visibleNotes;
    let lowest = use[0];
    // this is a cheat, but is guaranteed to work in this circumstance
    let highest = use[0];
    use.forEach(event => {
        if (event.octave < lowest.octave) {
            lowest = event;
        }
        if (event.octave > highest.octave) {
            highest = event;
        }
    })
    highestEvent.value = highest;
    return lowest;
})

const stringPositionOfOctave = (octave: number): number => {
    if (!lowestEvent.value) {
        return 0;
    }
    return 1 / Math.pow(2, (octave - lowestEvent.value.octave));
}

const stringPercentOfEvent = ({ octave }: { octave: number } = { octave: 0 }) => {
    return 100 - stringPositionOfOctave(octave) * 100;
}

const percentPositions = computed<number[]>(() => {
    return probe(view.visibleNotes.map(event => stringPercentOfEvent(event)));
})

const pluckPosition = computed<number>(() => {
    if (!highestEvent.value) {
        return 100;
    }
    const highestEventPercent = stringPercentOfEvent(highestEvent.value);
    return (100 + highestEventPercent) / 2;
})

const shaveNumber = (number: number, digits: number = 4) => {
    const factor = Math.pow(10, digits);
    let ret = Math.round(number * factor) / factor;
    if(ret !== number) {
        return '~' + ret;
    }
    return ret;
}

</script>

<template>
    <Collapsible
        tooltip="Select which constraints to enforce when adding new notes. Hover each button for a small explanation">
        <template v-slot:icon>
            <!-- <Magnet clas="icon"/> -->
            Physical
        </template>
        <div class="representation" style="height: 600px; width:90px; position:relative; ">
            <div class="bridge" :style="{
                backgroundColor: 'crimson',
                top: 0,
                left: '20%',
                width: '44%',
                height: (stringPercentOfEvent(highestEvent) + 2) + '%'
            }">
            </div>
            <template v-for="pos in percentPositions">
                <div class="fret-line" :style="{
                    top: pos + '%',
                    left: '22%',
                    width: '40%'
                }" />
                <span v-if="pos>0" class="fret-percent-text" :style="{
                    top: pos + '%',
                }">
                    {{ shaveNumber(pos) }}%
                </span>
            </template>
            <div x="0" y="0" width="20%" height="100%" />

            <div class="fret-percent-text" v-if="lowestEvent" :style="{
                top: stringPercentOfEvent(lowestEvent) + '%',
            }">
                string tuning: {{ lowestEvent.frequency }} hz
            </div>

            <div class="hole" v-if="pluckPosition" :style="{
                top: pluckPosition + '%',
            }">
            </div>

            <div class="the-string" style="left:44%; height:100%; border-left: solid 1px;"/>
        </div>

    </Collapsible>
</template>

<style scoped>
.representation {
    /* border: solid 1px; */
    margin: 1em;
}

.representation * {
    position: absolute;
}

.representation .fret-line {
    border-top: solid 1px;
}

.hole {
    border-radius: 50%;
    background-color: rgb(138, 46, 4);
    box-shadow: inset 15px 15px 10px black;
    width: 50px;
    height: 50px;
    left: 50%;
    transform: translate(-50%, -50%);
}
.fret-percent-text{
    transform: translateY(-0.5em);
    white-space: nowrap;
    left: 110%;
}
</style>
