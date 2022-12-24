<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Tool } from '../dataTypes/Tool';
import { usePlaybackStore } from '../store/playbackStore';
import { useViewStore } from '../store/viewStore';
import { SawtoothSynth } from '../synth/SawtoothSynth';
import Button from './Button.vue';

const view = useViewStore();
const playback = usePlaybackStore();


</script>

<template>
    <div id="transport-controls">
        <template v-if="playback.stopped">
            <Button :onClick="playback.play">
                <!-- play svg -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path d="M8 5v14l11-7z" />
                </svg>
            </Button>
        </template>
        <template v-else>
            <Button :onClick="playback.pause" :active="playback.paused">
                <!-- pause svg -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
            </Button>
        </template>
        <Button :onClick="playback.stop">
            <!-- stop svg -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path fill="none" d="M0 0h24v24H0z" />
                <path d="M6 6h12v12H6z" />
            </svg>
        </Button>
    </div>
</template>
