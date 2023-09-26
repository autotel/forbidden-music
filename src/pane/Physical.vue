<script setup lang="ts">
import Collapsible from './Collapsible.vue';

import { computed, ref } from 'vue';
import Tooltip from '../components/Tooltip.vue';
import { Note, getFrequency } from '../dataTypes/Note';
import { useViewStore } from '../store/viewStore';
import { useCustomSettingsStore } from '../store/customSettingsStore';
import Guitar from '../components/icons/Guitar.vue';
import { octaveToFrequency } from '../functions/toneConverters';

const stringLength = ref<number>(100);
const unit = ref<string>('%');
const view = useViewStore();
const userSettings = useCustomSettingsStore();

const highestEvent = ref<Note | undefined>(undefined);
const unique = (array: number[]) => {
    const set = new Set(array);
    return Array.from(set);
}

const lowestEvent = computed<Note | undefined>(() => {
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

const stringRatioOfEvent = ({ octave }: { octave: number } = { octave: 0 }) => {
    return 1 - stringPositionOfOctave(octave);
}

const percentPositions = computed<number[]>(() => {
    return unique(view.visibleNotes.map(event => stringRatioOfEvent(event)));
})

const pluckPosition = computed<number>(() => {
    if (!highestEvent.value) {
        return 1;
    }
    const highestEventPercent = stringRatioOfEvent(highestEvent.value);
    return (1 + highestEventPercent) / 2;
})

const shaveNumber = (number: number, digits: number = 4) => {
    const factor = Math.pow(10, digits);
    let ret = Math.round(number * factor) / factor;
    if (ret !== number) {
        return '~' + ret;
    }
    return ret;
}

const bridgeLeftPercent = 20;
const bridgeWidthPercent = 40;

</script>

<template>
    <Collapsible 
        v-if="userSettings.physicalEnabled"
        tooltip="Get indications how to produce the tones with a string and frets">
        <template v-slot:icon>
            <Guitar clas="icon" />
            Physical
        </template>
        <div class="representation" style="height: 600px; width:90px; position:relative; ">
            <div class="hole" v-if="pluckPosition" :style="{
                top: 100 * pluckPosition + '%',
            }">
            </div>
            <div class="bridge" :style="{
                width: bridgeWidthPercent + '%',
                height: (100 * stringRatioOfEvent(highestEvent) + 2) + '%'
            }">
            </div>
            <!-- each position fret line and label -->
            <template v-for="pos in percentPositions">
                <div class="fret-line" :style="{
                    top: 100 * pos + '%',
                }" />
                <span v-if="pos > 0" class="fret-percent-text" :style="{
                    top: 100 * pos + '%',
                }">
                    <Tooltip :tooltip="`fret placement: ${pos * stringLength + unit}`">
                        {{ shaveNumber(pos * stringLength) }}{{ unit }}
                    </Tooltip>
                </span>
            </template>
            <!-- total length line and label -->
            <div class="fret-line" :style="{
                top: '100%',
            }" />
            <span class="fret-percent-text with-input" :style="{
                top: '100%',
            }">
                <Tooltip tooltip="Specify string total length and unit. For example: 110 cm.">
                    string:
                    <input type="number" v-model="stringLength" />
                    <input type="text" v-model="unit" />
                </Tooltip>
            </span>

            <div class="fret-percent-text" v-if="lowestEvent" :style="{
                top: 100 * stringRatioOfEvent(lowestEvent) + '%',
            }">
                string tuning: {{ getFrequency(lowestEvent) }} hz
            </div>


            <div class="the-string" style="left:44%; height:100%; border-left: solid 1px rgb(214, 191, 176);" />
        </div>

    </Collapsible>
</template>

<style scoped>
.representation {
    /* border: solid 1px; */
    margin: 1em;
}

.representation>* {
    position: absolute;
}

.representation .fret-line {
    border-top: solid 2px goldenrod;
}

.bridge,
.fret-line {
    width: 40%;
    left: 30%;
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

.fret-percent-text {
    transform: translateY(-0.5em);
    white-space: nowrap;
    left: 110%;
}

.bridge {
    background-color: rgb(49, 21, 3);
}

.fret-percent-text.with-input {
    display: flex;
}

.fret-percent-text.with-input input {
    width: 4em;
}
</style>
