<script setup lang="ts">
import { ref } from "vue";
import { usePlaybackStore } from "../store/playbackStore";
import Button from "./Button.vue";
import PropSlider from './PropSlider.vue';
const playback = usePlaybackStore();
const params = await playback.getSynthParams();
const showing = ref(true);
</script>
<template>
    <div id="synthParamsWindow" :class="{ hide: !showing }" style="">
        <h2>synth params</h2>
        <Button :onClick="() => showing = !showing">
            {{ showing ? '▷' : '◁' }}
        </Button>

        <Suspense>
            <div>
                <template v-for="param in params">
                    <PropSlider :param="param" />
                </template>
            </div>
        </Suspense>
    </div>

</template>

    
<style>
#synthParamsWindow {
    position: fixed;
    right: 0;
    top: 30%;
    width: 300px;
    transition: right 0.3s;
}
#synthParamsWindow.hide Button:hover {
    left: -2em;
}
#synthParamsWindow.hide Button {
    left: -1em;
}
#synthParamsWindow Button{
    position: absolute;
    left: -2em;
    top: 0;
    height: 100%;
    transition: left 0.3s;
}
#synthParamsWindow.hide {
    right: -300px;
}
</style>