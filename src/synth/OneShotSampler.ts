import { NumberSynthParam, ParamType, ProgressSynthParam, SynthInstance, SynthParam } from "./SynthInterface";

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
    velocityToStartPoint: number = 0;
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
        absoluteNoteStart: number,
        velocity: number,
        noteStartedTimeAgo: number = 0,
        adsr: number[] = [0.01, 10, 0, 0.2],
    ) => {
        if (this.inUse) throw new Error("Polyphony fail: voice already in use");
        let skipSample = 0;
        if (noteStartedTimeAgo > 0) {
            // allow catch up, but not for already ended notes.
            if (noteStartedTimeAgo - duration < 0) return;
            duration -= noteStartedTimeAgo;
            skipSample = noteStartedTimeAgo;
        }
        const scoreNoteEnd = absoluteNoteStart + duration;
        const durationWithRelease = duration + adsr[3];

        this.inUse = true;
        const sampleSource = this.findSampleSourceClosestToFrequency(frequency, velocity);
        this.resetBufferSource(sampleSource);

        if (!this.bufferSource) throw new Error("bufferSource not created");
        this.bufferSource.playbackRate.value = frequency / sampleSource.sampleInherentFrequency;

        this.outputNode.gain.value = 0;
        let timeAccumulator = absoluteNoteStart;
        this.outputNode.gain.setValueAtTime(0, timeAccumulator);
        timeAccumulator += adsr[0];
        this.outputNode.gain.linearRampToValueAtTime(velocity, timeAccumulator);
        timeAccumulator += adsr[1];
        this.outputNode.gain.linearRampToValueAtTime(/**value!*/adsr[2], timeAccumulator);
        timeAccumulator = scoreNoteEnd;
        // this.outputNode.gain.cancelAndHoldAtTime(timeAccumulator);
        timeAccumulator += adsr[3];
        this.outputNode.gain.linearRampToValueAtTime(0, timeAccumulator);

        if (this.velocityToStartPoint) {
            if (velocity > 1) {
                console.error("velocity > 1");
            }
            skipSample += this.velocityToStartPoint * (1 - velocity);
        }

        this.bufferSource.start(absoluteNoteStart, skipSample, durationWithRelease);
        this.bufferSource.addEventListener("ended", this.releaseVoice);
    };

    triggerPerc = (
        frequency: number,
        absoluteNoteStart: number,
        velocity: number,
        noteStartedTimeAgo: number = 0,
        adsr: number[] = [0.01, 10, 0, 0.2],
    ) => {
        const sampleSource = this.findSampleSourceClosestToFrequency(frequency, velocity);
        // TODO: duration might be innacurate bc. of play rate
        const duration = sampleSource.sampleBuffer!.duration;
        this.triggerAttackRelease(
            frequency, 
            duration, 
            absoluteNoteStart, 
            velocity, 
            noteStartedTimeAgo, 
            adsr
        );
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
    isLoading: boolean = false;

    load = async () => {
        console.error("samplesource constructed wrong");
    };

    constructor(audioContext: AudioContext, sampleDefinition: SampleFileDefinition) {
        this.audioContext = audioContext;
        this.sampleInherentFrequency = sampleDefinition.frequency;
        if ('velocity' in sampleDefinition) {
            this.sampleInherentVelocity = sampleDefinition.velocity;
        }

        this.load = async () => {

            if (this.isLoaded || this.isLoading) throw new Error("redundant load call");
            this.isLoading = true;
            // const fetchHeaders = new Headers();
            const response = await fetch(sampleDefinition.path, {
                cache: "default",
            })
            console.groupCollapsed("header: " + sampleDefinition.path);
            response.headers.forEach((value, key) => {
                if (key.match('date')) {
                    console.log("loaded:", (Date.now() - Date.parse(value)) / 1000 / 60, " minutes ago");
                } else if (key.match('cache-control')) {
                    console.log(key + ":", value);
                }
            });
            console.groupEnd();
            const arrayBuffer = await response.arrayBuffer();
            this.sampleBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.isLoaded = true;
            this.isLoading = false;
        }
    }
}

export class OneShotSampler implements SynthInstance {
    private audioContext: AudioContext;
    private sampleSources: SampleSource[];
    private sampleVoices: SamplerVoice[] = [];
    outputNode: GainNode;
    private loadingProgress = 0;
    private velocityToStartPoint = 0;
    private adsr = [0.01, 10, 0, 0.2];
    credits: string = "";
    name: string = "One Shot Sampler";
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
        this.outputNode.gain.value = 0.3;
        this.sampleVoices.forEach((sampleVoice) => {
            sampleVoice.outputNode.connect(this.outputNode);
        });
        if (credits) this.credits = credits;
        if (name) this.name = name;
        
        this.enable = () => {
            this.sampleSources.forEach(async (sampleSource) => {
                if (sampleSource.isLoading || sampleSource.isLoaded) return;
                await sampleSource.load();
                this.loadingProgress += 1;
            });
        }
        this.disable = () => {
        }

        const parent = this;
        this.params.push({
            displayName: "Level",
            type: ParamType.number,
            min: 0, max: 4,
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
            },
            exportable: true,
        } as SynthParam);

        this.params.push({
            displayName: "Loading progress",
            type: ParamType.progress,
            min: 0, max: sampleDefinitions.length,
            get value() {
                return parent.loadingProgress;
            },
            exportable: false,
        } as ProgressSynthParam);

        this.adsr.forEach((v, i) => {
            this.params.push({
                displayName: ['attack', 'decay', 'sustain', 'release'][i],
                type: ParamType.number,
                min: 0, max: 10,
                get value() {
                    return parent.adsr[i];
                },
                set value(value: number) {
                    parent.adsr[i] = value;
                },
                curve: 'log',
                exportable: true,
            } as NumberSynthParam);
        });

        this.params.push({
            displayName: "Velocity to start point, seconds",
            type: ParamType.number,
            min: 0, max: 3,
            get value() {
                return parent.velocityToStartPoint;
            },
            set value(value: number) {
                parent.velocityToStartPoint = value;
            },
            curve: 'log',
            exportable: true,
        } as SynthParam);


    }
    triggerAttackRelease = (
        frequency: number,
        duration: number,
        absoluteNoteStart: number,
        velocity: number,
        noteStartedTimeAgo: number = 0
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
        sampleVoice.velocityToStartPoint = this.velocityToStartPoint;
        sampleVoice.triggerAttackRelease(
            frequency, 
            duration, 
            absoluteNoteStart, 
            velocity, 
            noteStartedTimeAgo,
            this.adsr
        );
    };
    triggerPerc = (
        frequency: number, 
        absoluteNoteStart: number, 
        velocity: number, 
        noteStartedTimeAgo: number = 0 
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
        sampleVoice.velocityToStartPoint = this.velocityToStartPoint;

        sampleVoice.triggerPerc(
            frequency, 
            absoluteNoteStart, 
            velocity, 
            noteStartedTimeAgo, 
            this.adsr
        );

    };
    releaseAll = () => {
        this.sampleVoices.forEach((sampleVoice) => {
            sampleVoice.stop();
        });
    }
    params = [] as SynthParam[];
}
