<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, Ref, ref, watch } from "vue";
import Button from "../../components/Button.vue";
import ButtonSub from "../../components/ButtonSub.vue";
import HeartPulse from "../../components/icons/HeartPulse.vue";
import { useAudioContextStore } from "../../store/audioContextStore";
import { useCustomSettingsStore } from "../../store/customSettingsStore";
import { useEffectsStore } from "../../store/effectsStore";
import { useLayerStore } from "../../store/layerStore";
import { useMonoModeInteraction } from "../../store/monoModeInteraction";
import { SynthChannel, useSynthStore } from "../../store/synthStore";
import { useToolStore } from "../../store/toolStore";
import { layerNoteColorStrings } from "../../store/viewStore";
import { SynthInterface } from "../../synth/super/Synth";
import { EffectInstance } from "../../synth/super/SynthInterface";
import SynthSelector from "./SynthSelector.vue";
import Collapsible from "../Collapsible.vue";
import ParamsSliderList from "./ParamsSliderList.vue";

const infoTextModal = inject<Ref<string>>('modalText');
const monoModeInteraction = useMonoModeInteraction();
const effects = useEffectsStore();
const synth = useSynthStore();
const audioReady = ref(false);
const userSettings = useCustomSettingsStore();
const tool = useToolStore();
const layers = useLayerStore();
const audioContextStore = useAudioContextStore();

const showCredits = (ofSynth: SynthInterface | EffectInstance) => {
    if (!infoTextModal) throw new Error('infoTextModal not injected');
    if (!('credits' in ofSynth)) return;
    const credits = ofSynth.credits as string;
    infoTextModal.value = credits;
    monoModeInteraction.activate("credits modal");
}


onMounted(() => {
    audioContextStore.audioContextPromise.then(() => {
        audioReady.value = true;
    })
})
onBeforeUnmount(() => {
    audioReady.value = false;
})



const activeLayerChan = ref<SynthChannel | null>(null);

const setActiveLayerChanToCurrentLayerTarget = () => {
    const activeLayer = tool.currentLayerNumber;
    const channel = layers.getLayerChannel(activeLayer);
    if (channel) {
        activeLayerChan.value = channel;
    } else {
        activeLayerChan.value = null;
    }
};

watch([
    // () => tool.currentLayerNumber, 
    () => layers.layers[tool.currentLayerNumber]?.channelSlot
], setActiveLayerChanToCurrentLayerTarget);

onMounted(() => audioContextStore.audioContextPromise.then(() => {
    setActiveLayerChanToCurrentLayerTarget();
}))

</script>
<template>
    <Collapsible tooltip="Change some parameters of the sound">
        <template #icon>
            <HeartPulse clas="icon" />
            Sounds
        </template>
        <div>
            <div v-if="audioReady" class="controls-container">
                <h2 class="padded">Synth</h2>

                <template v-if="userSettings.multiTimbralityEnabled">
                    <h3 class="padded">Layer polyphony</h3>
                    <template v-for="(synthChan, chanNo) in synth.channels">
                        <Button :onClick="() => activeLayerChan = synthChan" :active="synthChan === activeLayerChan"
                            style="width:calc(100% - 2em); display:flex; justify-content: space-between;"
                            :style="chanNo ? 'padding-left:2em' : ''" :active-color="layerNoteColorStrings[1]"
                            class="padded" :tooltip="`open synth control channel ${chanNo} (assigned in layers)`">
                            <template v-if="chanNo === 0">
                                default -
                            </template>
                            <template v-else>
                                <span class="encircled">{{ chanNo }}</span>
                            </template>
                            {{ synthChan.synth.name }}

                            <ButtonSub class="sub-button" :onClick="() => { synth.channels.splice(chanNo, 1) }">
                                ×
                            </ButtonSub>
                        </Button>
                    </template>
                    <Button v-if="userSettings.multiTimbralityEnabled" :on-click="() => { synth.addChannel() }"
                        class="padded" tooltip="Add a new synth channel">
                        + Channel
                    </Button>

                </template>
                <SynthSelector :activeLayerChan="activeLayerChan" :show-credits="showCredits" />
                <br><br>
                <template v-if="userSettings.effectsEnabled">
                    <h2 class="padded">Master effects</h2>
                    <template v-for="effect in effects.effectsChain">
                        <h3 class="padded">{{ effect.name }}</h3>
                        <ParamsSliderList :synthParams="effect.params" />
                        <Button class="padded" v-if="effect.credits"
                            :on-click="() => activeLayerChan ? showCredits(effect) : null">
                            Credits
                        </Button>
                    </template>
                </template>
            </div>
            <div v-else>
                <Button :on-click="() => { audioContextStore.retryAudioContext() }">Click to start audio engine</Button>
            </div>
        </div>
    </Collapsible>
</template>
<style scoped>
.controls-container {
    width: 100%;
    box-sizing: border-box;
}

.encircled {
    display: inline-flex;
    border-radius: 50%;
    background-color: rgb(31, 4, 95);
    color: white;
    /* border:solid 1.2px white; */
    font-weight: 800;
    justify-content: center;
    align-items: center;
    width: 1.5em;
    height: 1.5em;

    position: relative;
    left: -1.5em;
}
</style>