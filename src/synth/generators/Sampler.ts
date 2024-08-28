import { SampleKitDefinition } from "@/store/externalSampleLibrariesStore";
import { chromaticSampleKitManager, findSampleSourceClosestToFrequency, SampleKitUser, SampleSource } from "../features/chromaticSampleKitUser";
import { EventParamsBase, Synth, SynthVoice } from "../types/Synth";
import { NumberSynthParam, OtherSynthParam, ParamType, ProgressSynthParam, SynthParam } from "../types/SynthParam";

const samplerVoice = (
    audioContext: AudioContext,
    sampleSources: SampleSource[] = []
): SynthVoice => {
    let velocityToStartPoint: number = 0;
    let bufferSource: AudioBufferSourceNode | undefined;
    const output = audioContext.createGain();
    output.gain.value = 0;
    let countPerVelocityStep: { [key: number]: number } = {};
    let timeAccumulator = 0;
    let currentAdsr = [0.01, 10, 0, 0.2];

    const voiceState = {
        inUse: false,
    }

    sampleSources.forEach((sampleSource) => {
        if ('sampleInherentVelocity' in sampleSource) {
            const velocity = sampleSource.sampleInherentVelocity as number;
            if (!countPerVelocityStep[velocity]) {
                countPerVelocityStep[velocity] = 0;
            }
            countPerVelocityStep[velocity] += 1;
        }
    });

    sampleSources.sort((a, b) => {
        if (!a.sampleInherentVelocity) return -1;
        if (!b.sampleInherentVelocity) return 1;
        return a.sampleInherentVelocity - b.sampleInherentVelocity;
    });


    const cancelScheduledValues = () => {
        output.gain.cancelScheduledValues(0);
        // this.output.gain.value = 0;
    }

    const resetBufferSource = (sampleSource?: SampleSource) => {
        if (bufferSource) {
            bufferSource.removeEventListener("ended", releaseVoice);
            bufferSource.disconnect();
            bufferSource.stop();
            bufferSource = undefined;
        }

        if (!sampleSource) return;
        if (!sampleSource.sampleBuffer) throw new Error("sample buffer not loaded");

        cancelScheduledValues();

        bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = sampleSource.sampleBuffer;
        bufferSource.connect(output);
    }



    interface SamplerEventParams extends EventParamsBase {
        velocity: number,
        adsr: number[],
    }


    const releaseVoice = () => {
        voiceState.inUse = false;
        resetBufferSource();
    }
    const stop = () => {
        releaseVoice();
    };
    return {
        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            {
                velocity, adsr = [0.01, 10, 0, 0.2],
            }: SamplerEventParams
        ) {
            currentAdsr = adsr;
            if (voiceState.inUse) throw new Error("Polyphony fail: voice already in use");
            let noteStartedTimeAgo = audioContext.currentTime - absoluteStartTime;

            let skipSample = 0;
            if (noteStartedTimeAgo > 0) {
                skipSample = noteStartedTimeAgo;
            }
            
            const sampleSource = findSampleSourceClosestToFrequency(sampleSources, frequency, velocity);
            if(!sampleSource) {
                console.error("no sample source available");
                return;
            }
            voiceState.inUse = true;
            resetBufferSource(sampleSource);

            if (!bufferSource) throw new Error("bufferSource not created");
            bufferSource.playbackRate.value = frequency / sampleSource.sampleInherentFrequency;

            output.gain.value = 0;
            timeAccumulator = absoluteStartTime;
            output.gain.setValueAtTime(0, timeAccumulator);
            timeAccumulator += currentAdsr[0];
            output.gain.linearRampToValueAtTime(velocity, timeAccumulator);
            timeAccumulator += currentAdsr[1];
            output.gain.linearRampToValueAtTime(/**value!*/currentAdsr[2], timeAccumulator);

            if (velocityToStartPoint) {
                if (velocity > 1) {
                    console.error("velocity > 1");
                }
                skipSample += velocityToStartPoint * (1 - velocity);
            }

            bufferSource.start(absoluteStartTime, skipSample);
            bufferSource.addEventListener("ended", releaseVoice);
            return this;
        },
        scheduleEnd(
            absoluteEndTime?: number,
        ) {
            const end = absoluteEndTime ? (absoluteEndTime + currentAdsr[3]) : 0;
            output.gain.linearRampToValueAtTime(0, end);
            return this;
        },
        stop,
        output,
        get inUse() {
            return voiceState.inUse;
        },
        set inUse(value: boolean) {
            voiceState.inUse = value;
        }
    } as SynthVoice;
}
type SamplerVoice = ReturnType<typeof samplerVoice>;

export class Sampler extends Synth<EventParamsBase, SamplerVoice> implements SampleKitUser {
    private velocityToStartPoint = 0;
    private adsr = [0.01, 10, 0, 0.2];
    needsFetching = true;
    name = "Sampler";
    credits = "Web audio one shot sampler implementation by Autotel";
    sampleKitManager: ReturnType<typeof chromaticSampleKitManager>;
    sampleKitParam: OtherSynthParam;
    loadingProgressParam: ProgressSynthParam;

    constructor(
        audioContext: AudioContext,
        initialSamplesDefinition: SampleKitDefinition,
    ) {
        const sampleKitManager = chromaticSampleKitManager(audioContext, initialSamplesDefinition);

        super(audioContext, (a) => samplerVoice(a, sampleKitManager.sampleSources));

        this.sampleKitManager = sampleKitManager;

        this.output = audioContext.createGain();
        this.output.gain.value = 0.3;

        this.sampleKitParam = sampleKitManager.sampleKitParam;
        this.loadingProgressParam = sampleKitManager.loadingProgressParam;

        setTimeout(() => {
            this.sampleKitParam.value = initialSamplesDefinition;
        });

        const parent = this;
        this.params.push({
            displayName: "Level",
            type: ParamType.number,
            min: 0, max: 4,
            get value() {
                if (!parent.output) {
                    console.warn("output node not set");
                    return 1;
                }
                return parent.output.gain.value;
            },
            set value(value: number) {
                if (!parent.output) return;
                parent.output.gain.value = value;
            },
            exportable: true,
        } as SynthParam);
        this.params.push(this.sampleKitParam);
        this.params.push(this.loadingProgressParam);

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

        sampleKitManager.addSampleKitChangedListener( (sampleKitDef: SampleKitDefinition) => {
            this.credits = sampleKitDef.readme || '';
            this.instances.forEach((instance) => instance.scheduleEnd(audioContext.currentTime));
            this.instances.length = 0;
        });
    }

    scheduleStart = (
        frequency: number,
        absoluteStartTime: number,
        eventParams: EventParamsBase,
    ) => super.scheduleStart(frequency, absoluteStartTime, {
        adsr: this.adsr,
        ...eventParams
    });

    schedulePerc(
        frequency: number,
        absoluteStartTime: number,
        noteParameters: EventParamsBase
    ): SynthVoice<EventParamsBase> {
        const tweakedAdsr = [...this.adsr];
        tweakedAdsr[3] *= 4 * noteParameters.velocity;

        const tweakedParam = {
            ...noteParameters,
            adsr: tweakedAdsr,
        };
        const voice = this.scheduleStart(frequency, absoluteStartTime, tweakedParam);
        voice.scheduleEnd(absoluteStartTime + this.adsr[0]);
        return voice;
    }
}
