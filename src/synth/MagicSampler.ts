import { ParamType, SynthInstance, SynthParam } from "./SynthInterface";

class PerformanceChronometer {
    private startTime: number;
    constructor() {
        this.startTime = performance.now();
    }
    getElapsedTime = () => {
        return performance.now() - this.startTime;
    }
    reset = () => {
        this.startTime = performance.now();
    }
    logElapsedTime = (text: string) => {
        console.log(text, this.getElapsedTime().toFixed(2), "ms");
        this.reset();
    }
}

interface SampleFileDefinition {
    name: string;
    frequency: number;
    velocity?: number;
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
        let countPerVelocityStep: { [key: number]: number } = {};
        sampleSources.forEach((sampleSource) => {
            if ('sampleInherentVelocity' in sampleSource) {
                const velocity = sampleSource.sampleInherentVelocity as number;
                if (!countPerVelocityStep[velocity]) {
                    countPerVelocityStep[velocity] = 0;
                }
                countPerVelocityStep[velocity] += 1;
            }
        });
        this.sampleSoruces.sort((a, b) => {
            if (!a.sampleInherentVelocity) return -1;
            if (!b.sampleInherentVelocity) return 1;
            return a.sampleInherentVelocity - b.sampleInherentVelocity;
        });
    }

    private cancelScheduledValues() {
        this.outputNode.gain.cancelScheduledValues(0);
        // this.outputNode.gain.value = 0;
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
        // this.bufferSource.connect(this.audioContext.destination);

    }

    private releaseVoice = () => {
        this.inUse = false;
    }

    private findSampleSourceClosestToFrequency = (frequency: number, velocity?: number) => {
        let closestSampleSource = this.sampleSoruces[0];
        if (this.sampleSoruces.length == 1) return closestSampleSource;

        if (velocity == undefined) {
            let closestSampleSourceDifference = Math.abs(frequency - closestSampleSource.sampleInherentFrequency);
            for (let i = 1; i < this.sampleSoruces.length; i++) {
                const sampleSource = this.sampleSoruces[i];
                if (!sampleSource.isLoaded) continue;
                const difference = Math.abs(frequency - sampleSource.sampleInherentFrequency);
                if (difference < closestSampleSourceDifference) {
                    closestSampleSource = sampleSource;
                    closestSampleSourceDifference = difference;
                }
            }
        } else {
            const sampleSourcesWithVelocityAboveOrEqual = this.sampleSoruces.filter((sampleSource) => {
                if (!sampleSource.sampleInherentVelocity) return true;
                return sampleSource.sampleInherentVelocity >= velocity;
            });

            if (sampleSourcesWithVelocityAboveOrEqual.length == 0) {
                this.findSampleSourceClosestToFrequency(frequency);
            }
            
            let closestSampleWithLeastVelocityDifference = sampleSourcesWithVelocityAboveOrEqual[0];
            let closestSampleWithLeastVelocityDifferenceDifference = Math.abs(frequency - closestSampleWithLeastVelocityDifference.sampleInherentFrequency);
            for (let i = 1; i < sampleSourcesWithVelocityAboveOrEqual.length; i++) {
                const sampleSource = sampleSourcesWithVelocityAboveOrEqual[i];
                if (!sampleSource.isLoaded) continue;
                const difference = Math.abs(frequency - sampleSource.sampleInherentFrequency);
                if (difference < closestSampleWithLeastVelocityDifferenceDifference) {
                    closestSampleWithLeastVelocityDifference = sampleSource;
                    closestSampleWithLeastVelocityDifferenceDifference = difference;
                }
            }
            closestSampleSource = closestSampleWithLeastVelocityDifference;
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
        let catchup = relativeNoteStart < 0;
        let skipSample = 0;
        if (catchup) {
            // allow catch up, but not for already ended notes.
            if (relativeNoteStart + duration < 0) return;
            duration += relativeNoteStart;
            skipSample = -relativeNoteStart;
            relativeNoteStart = 0;
        }
        const absoluteNoteStart = this.audioContext.currentTime + relativeNoteStart;
        const absoluteNoteEnd = absoluteNoteStart + duration;
        this.inUse = true;
        const sampleSource = this.findSampleSourceClosestToFrequency(frequency, velocity);
        this.resetBufferSource(sampleSource);

        if (!this.bufferSource) throw new Error("bufferSource not created");
        this.bufferSource.playbackRate.value = frequency / sampleSource.sampleInherentFrequency;

        this.outputNode.gain.value = 0;
        this.outputNode.gain.linearRampToValueAtTime(velocity, absoluteNoteStart + 0.001);
        this.outputNode.gain.linearRampToValueAtTime(velocity, absoluteNoteEnd);
        this.outputNode.gain.linearRampToValueAtTime(0, absoluteNoteEnd + 0.3);
        // note: offset start is not quite precise because it's missing the pitch shift component
        this.bufferSource.start(absoluteNoteStart, skipSample, duration);
        this.bufferSource.addEventListener("ended", this.releaseVoice);
    };

    triggerPerc = (
        frequency: number,
        relativeNoteStart: number,
        velocity: number
    ) => {
        const sampleSource = this.findSampleSourceClosestToFrequency(frequency, velocity);
        // TODO: duration might be innacurate bc. of play rate
        const duration = sampleSource.sampleBuffer!.duration;
        this.triggerAttackRelease(frequency, duration, relativeNoteStart, velocity);
    }

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
    sampleInherentVelocity?: number;
    isLoaded: boolean = false;
    private isLoading: boolean = false;

    load = () => {
        console.error("samplesource constructed wrong");
    };

    constructor(audioContext: AudioContext, sampleDefinition: SampleFileDefinition) {
        this.audioContext = audioContext;
        this.sampleInherentFrequency = sampleDefinition.frequency;
        if ('velocity' in sampleDefinition) {
            this.sampleInherentVelocity = sampleDefinition.velocity;
        }

        this.load = () => {

            if (this.isLoaded || this.isLoading) return console.warn("redundant load call");
            this.isLoading = true;

            fetch(sampleDefinition.path).then(async (response) => {
                const arrayBuffer = await response.arrayBuffer();
                this.sampleBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

                console.log("loaded", sampleDefinition.name);
                this.isLoaded = true;
                this.isLoading = false;
            });
        }
    }
}

export class MagicSampler implements SynthInstance {
    private audioContext: AudioContext;
    private sampleSources: SampleSource[];
    private sampleVoices: SamplerVoice[] = [];
    private outputNode: GainNode;
    credits: string = "";
    name: string = "unnamed";
    enable: () => void;
    disable: () => void;
    constructor(
        audioContext: AudioContext,
        sampleDefinitions: SampleFileDefinition[],
        name?: string,
        credits?: string
    ) {
        this.audioContext = audioContext;
        this.sampleSources = sampleDefinitions.map((sampleDefinition) => {
            return new SampleSource(audioContext, sampleDefinition);
        });
        this.outputNode = this.audioContext.createGain();
        this.sampleVoices.forEach((sampleVoice) => {
            sampleVoice.outputNode.connect(this.outputNode);
        });
        this.outputNode.connect(audioContext.destination);
        if (credits) this.credits = credits;
        if (name) this.name = name;
        this.enable = () => {
            this.sampleSources.forEach((sampleSource) => {
                sampleSource.load();
            });
        }
        this.disable = () => {
        }

        const parent = this;
        this.params.push({
            displayName: "Gain",
            type: ParamType.number,
            min:0, max: 4,
            get value() {
                if (!parent.outputNode) {
                    console.warn("output node not set");
                    return 1;
                }
                return parent.outputNode.gain.value;
            },
            set value(value: number) {
                if (!parent.outputNode) return;
                parent.outputNode.gain.value = value;
            }
        } as SynthParam);


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
            sampleVoice.outputNode.connect(this.outputNode);

        }
        sampleVoice.triggerAttackRelease(frequency, duration, relativeNoteStart, velocity);
    };
    triggerPerc = (frequency: number, relativeNoteStart: number, velocity: number) => {
        let sampleVoice = this.sampleVoices.find((sampleVoice) => {
            return !sampleVoice.inUse;
        });
        if (!sampleVoice) {
            const sampleVoiceIndex = this.sampleVoices.length;
            this.sampleVoices.push(new SamplerVoice(this.audioContext, this.sampleSources));
            sampleVoice = this.sampleVoices[sampleVoiceIndex];
            sampleVoice.outputNode.connect(this.outputNode);

        }
        sampleVoice.triggerPerc(frequency, relativeNoteStart, velocity);

    };
    releaseAll = () => {
        this.sampleVoices.forEach((sampleVoice) => {
            sampleVoice.stop();
        });
    }
    params = [] as SynthParam[];
}
