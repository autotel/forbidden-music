import * as Tone from "tone";
import { FMSynth, FMSynthOptions, Freeverb, PolySynth, Sampler } from 'tone';
import { AnyAudioContext } from "tone/build/esm/core/context/AudioContext";
import { SynthInstance, SynthParam, ParamType } from "./Synthinterface";

interface SampleFileDefinition {
    name: string;
    frequency: number;
    path: string;
}

class SamplerVoice {
    inUse: boolean = false;
    sampleSoruces: SampleSource[] = [];
    private bufferSource?: AudioBufferSourceNode;
    outputNode: GainNode;
    audioContext: AudioContext;
    constructor(audioContext: AudioContext, sampleSources: SampleSource[]) {
        this.sampleSoruces = sampleSources;
        this.audioContext = audioContext;
        this.outputNode = this.audioContext.createGain();
        this.outputNode.gain.value = 0;
    }

    private cancelScheduledValues() {
        this.outputNode.gain.cancelScheduledValues(0);
        this.outputNode.gain.value = 0;
    }

    private resetBufferSource(sampleSource?: SampleSource) {
        if (this.bufferSource) {
            this.bufferSource.removeEventListener("ended", this.releaseVoice);
            this.bufferSource.disconnect();
            this.bufferSource.stop();
            this.bufferSource = undefined;
        }

        if (!sampleSource) return;
        if (!sampleSource.sampleBuffer) throw new Error("sample buffer not loaded");

        this.cancelScheduledValues();

        this.bufferSource = this.audioContext.createBufferSource();
        this.bufferSource.buffer = sampleSource.sampleBuffer;
        this.bufferSource.connect(this.outputNode);
    }

    private releaseVoice = () => {
        this.inUse = false;
    }

    private findSampleSourceClosestToFrequency = (frequency: number) => {
        let closestSampleSource = this.sampleSoruces[0];
        let closestSampleSourceDifference = Math.abs(frequency - closestSampleSource.sampleInherentFrequency);
        for (let i = 1; i < this.sampleSoruces.length; i++) {
            const sampleSource = this.sampleSoruces[i];
            const difference = Math.abs(frequency - sampleSource.sampleInherentFrequency);
            if (difference < closestSampleSourceDifference) {
                closestSampleSource = sampleSource;
                closestSampleSourceDifference = difference;
            }
        }
        return closestSampleSource;
    }

    triggerAttackRelease = (
        frequency: number,
        duration: number,
        relativeNoteStart: number,
        velocity: number
    ) => {
        if (this.inUse) throw new Error("Polyphony fail: voice already in use");

        // allow catch up, but not for already ended notes.
        if (relativeNoteStart + duration < 0) return;
        if (relativeNoteStart < 0) {
            duration += relativeNoteStart;
            relativeNoteStart = 0;
        }

        this.inUse = true;
        const sampleSource = this.findSampleSourceClosestToFrequency(frequency);
        this.resetBufferSource(sampleSource);

        if (!this.bufferSource) throw new Error("bufferSource not created");
        this.bufferSource.playbackRate.value = frequency / sampleSource.sampleInherentFrequency;

        this.outputNode.gain.setValueAtTime(0, relativeNoteStart);
        this.outputNode.gain.linearRampToValueAtTime(velocity, relativeNoteStart + 0.01);
        this.outputNode.gain.linearRampToValueAtTime(0, relativeNoteStart + duration);

        this.bufferSource.start(relativeNoteStart, 0, duration);
        this.bufferSource.addEventListener("ended", this.releaseVoice);
    };

    stop = () => {
        if (!this.bufferSource) return;
        this.resetBufferSource();
        this.releaseVoice();
    };

}
class SampleSource {
    private audioContext: AudioContext;
    sampleBuffer?: AudioBuffer;
    sampleInherentFrequency: number;

    constructor(audioContext: AudioContext, sampleDefinition: SampleFileDefinition) {
        this.audioContext = audioContext;
        this.sampleInherentFrequency = sampleDefinition.frequency;
        fetch(sampleDefinition.path).then(async (response) => {
            const arrayBuffer = await response.arrayBuffer();
            this.sampleBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            console.log("loaded", sampleDefinition.name);
        });
    }
}

export class MagicSampler implements SynthInstance {
    private audioContext: AudioContext;
    private sampleSources: SampleSource[];
    private sampleVoices: SamplerVoice[] = [];
    private outputNode: GainNode;
    name: string = "unnamed";
    constructor(
        audioContext: AudioContext, 
        sampleDefinitions: SampleFileDefinition[], 
        name?: string
    ) {
        this.audioContext = audioContext;
        this.sampleSources = sampleDefinitions.map((sampleDefinition) => {
            return new SampleSource(audioContext, sampleDefinition);
        });
        this.outputNode = this.audioContext.createGain();
        this.sampleVoices.forEach((sampleVoice) => {
            sampleVoice.outputNode.connect(this.outputNode);
        });
        if (name) this.name = name;
    }
    triggerAttackRelease = (
        frequency: number,
        duration: number,
        relativeNoteStart: number,
        velocity: number
    ) => {
        let sampleVoice = this.sampleVoices.find((sampleVoice) => {
            return !sampleVoice.inUse;
        });
        if (!sampleVoice) {
            const sampleVoiceIndex = this.sampleVoices.length;
            this.sampleVoices.push(new SamplerVoice(this.audioContext, this.sampleSources));
            sampleVoice = this.sampleVoices[sampleVoiceIndex];
            console.log("polyphony increased to", this.sampleVoices.length);
            sampleVoice.outputNode.connect(this.outputNode);

        }
        sampleVoice.triggerAttackRelease(frequency, duration, relativeNoteStart, velocity);
    };
    releaseAll = () => {
        this.sampleVoices.forEach((sampleVoice) => {
            sampleVoice.stop();
        });
    }
    set = (params: any) => {
        // do nothing
    }
    get = () => {
        return {};
    }
    connect = (destination: AudioNode) => {
        this.outputNode.connect(destination);
    }
    disconnect = () => {
        this.outputNode.disconnect();
    }
    getParams = () => {
        return [];
    }
}
 