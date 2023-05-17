import { SynthInstance } from "./SynthInterface";

interface SampleFileDefinition {
    name: string;
    frequency: number;
    path: string;
}

// TODO: add the possibility for loop points, granular,
// fft based extension, what have you.
class SamplerVoice {
    inUse: boolean = false;
    /** the timbral component containing the pitch */
    shiftedSampleSources: SampleSource[] = [];
    /** 
     * the timbral component containing constant elements such as 
     * the initial impulse, noise, etc.
     * */
    fixedSampleSources: SampleSource[] = [];
    // but in the future, maybe a samplesource is configurable to serve either role
    // so that the user can layer stuff at will

    private bufferSource?: AudioBufferSourceNode;
    private bufferSource2?: AudioBufferSourceNode;
    outputNode: GainNode;
    audioContext: AudioContext;
    constructor(
        audioContext: AudioContext,
        sampleSources: SampleSource[],
        sampleSources2: SampleSource[]
    ) {
        this.shiftedSampleSources = sampleSources;
        this.fixedSampleSources = sampleSources2;
        this.audioContext = audioContext;
        this.outputNode = this.audioContext.createGain();
        this.outputNode.gain.value = 0;
    }

    private cancelScheduledValues() {
        this.outputNode.gain.cancelScheduledValues(0);
        // this.outputNode.gain.value = 0;
    }

    private resetBufferSource(sampleSource?: SampleSource, sampleSource2?: SampleSource) {
        if (this.bufferSource) {
            this.bufferSource.removeEventListener("ended", this.releaseVoice);
            this.bufferSource.disconnect();
            this.bufferSource.stop();
            this.bufferSource = undefined;
        }
        if (this.bufferSource2) {
            this.bufferSource2.removeEventListener("ended", this.releaseVoice);
            this.bufferSource2.disconnect();
            this.bufferSource2.stop();
            this.bufferSource2 = undefined;
        }

        if (!sampleSource) return;
        if (!sampleSource.sampleBuffer) throw new Error("sample buffer not loaded");

        this.cancelScheduledValues();

        this.bufferSource = this.audioContext.createBufferSource();
        this.bufferSource.buffer = sampleSource.sampleBuffer;
        this.bufferSource.connect(this.outputNode);
        // this.bufferSource.connect(this.audioContext.destination);

        if (!sampleSource2?.sampleBuffer) return;
        this.bufferSource2 = this.audioContext.createBufferSource();
        this.bufferSource2.buffer = sampleSource2.sampleBuffer;
        this.bufferSource2.connect(this.outputNode);


    }

    private releaseVoice = () => {
        console.log("v released");
        this.inUse = false;
    }

    private findSampleSourceClosestToFrequency = (frequency: number) => {
        let closestSampleSource = this.shiftedSampleSources[0];
        let closestSampleSourceDifference = Math.abs(frequency - closestSampleSource.sampleInherentFrequency);
        for (let i = 1; i < this.shiftedSampleSources.length; i++) {
            const sampleSource = this.shiftedSampleSources[i];
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
        const sampleSource = this.findSampleSourceClosestToFrequency(frequency);
        const sampleSource2 = this.fixedSampleSources[0];
        this.resetBufferSource(sampleSource, sampleSource2);

        if (!this.bufferSource) throw new Error("bufferSource not created");
        this.bufferSource.playbackRate.value = frequency / sampleSource.sampleInherentFrequency;

        this.outputNode.gain.value = velocity;
        this.outputNode.gain.linearRampToValueAtTime(velocity, absoluteNoteStart);
        this.outputNode.gain.linearRampToValueAtTime(0, absoluteNoteEnd);
        this.bufferSource.start(absoluteNoteStart, skipSample, duration);
        this.bufferSource.addEventListener("ended", this.releaseVoice);
        if (this.bufferSource2) {
            this.bufferSource2.start(absoluteNoteStart, skipSample, duration);
        }
    };

    triggerPerc = (
        frequency: number,
        relativeNoteStart: number,
        velocity: number
    ) => {
        const sampleSource = this.findSampleSourceClosestToFrequency(frequency);
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

export class ComplexSampler implements SynthInstance {
    private audioContext: AudioContext;
    private sampleSources: SampleSource[];
    private fixedSampleSources: SampleSource[];
    private sampleVoices: SamplerVoice[] = [];
    private outputNode: GainNode;
    credits: string = "";
    name: string = "unnamed";
    constructor(
        audioContext: AudioContext,
        sampleDefinitions: SampleFileDefinition[],
        name?: string,
        credits?: string
    ) {
        this.audioContext = audioContext;
        this.sampleSources = [];
        this.fixedSampleSources = [];
        sampleDefinitions.forEach((sampleDefinition) => {
            if (sampleDefinition.frequency < 1) {
                console.log("fixed", sampleDefinition.frequency);
                this.fixedSampleSources.push(new SampleSource(audioContext, sampleDefinition));
            } else {
                console.log("shifted", sampleDefinition.frequency);
                this.sampleSources.push(new SampleSource(audioContext, sampleDefinition));
            }
        });
        this.outputNode = this.audioContext.createGain();
        this.sampleVoices.forEach((sampleVoice) => {
            sampleVoice.outputNode.connect(this.outputNode);
        });
        this.outputNode.connect(audioContext.destination);
        if (credits) this.credits = credits;
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
            this.sampleVoices.push(
                new SamplerVoice(
                    this.audioContext,
                    this.sampleSources,
                    this.fixedSampleSources
                ));
            sampleVoice = this.sampleVoices[sampleVoiceIndex];
            console.log("polyphony increased to", this.sampleVoices.length);
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
            this.sampleVoices.push(
                new SamplerVoice(
                    this.audioContext,
                    this.sampleSources,
                    this.fixedSampleSources
                ));
            sampleVoice = this.sampleVoices[sampleVoiceIndex];
            console.log("polyphony increased to", this.sampleVoices.length);
            sampleVoice.outputNode.connect(this.outputNode);

        }
        sampleVoice.triggerPerc(frequency, relativeNoteStart, velocity);

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
