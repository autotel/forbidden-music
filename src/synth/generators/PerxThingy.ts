import { oneShotEnvelope } from "../features/oneShotEnvelope";
import { AutomatableSynthParam, getTweenSlice } from "../types/Automatable";
import { EventParamsBase, Synth } from "../types/Synth";
import { NumberSynthParam, ParamType, SynthParam } from "../types/SynthParam";


type PerxThingyNoteParams = {
    envelopeBuffer: AudioBuffer,
    velocity: number,
}

const perxVoice = (audioContext: AudioContext) => {

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;
    
    oscillator.connect(gainNode);
    oscillator.start();

    let audioBufferSource = audioContext.createBufferSource();
    let noteStarted = 0;
    let noteVelocity = 0;
    let currentStopTimeout: ReturnType<typeof setTimeout> | undefined;

    return {
        inUse: false,
        output: gainNode,
        imprecision: 0 as number,
        pan: 0 as number,

        scheduleStart(
            frequency: number,
            absoluteStartTime: number,
            params: PerxThingyNoteParams
        ) {
            if (currentStopTimeout) {
                clearTimeout(currentStopTimeout);
                currentStopTimeout = undefined;
            }
            noteVelocity = params.velocity;
            const buffer = params.envelopeBuffer;
            this.inUse = true;
            oscillator.frequency.value = frequency;
            audioBufferSource = audioContext.createBufferSource();
            audioBufferSource.buffer = buffer;
            audioBufferSource.connect(gainNode.gain);
            audioBufferSource.start(absoluteStartTime);

            return this;
        },
        scheduleEnd(absoluteEndTime?: number) {
            if (absoluteEndTime) {
                const noteDuration = absoluteEndTime - noteStarted;
                audioBufferSource.stop(absoluteEndTime);
                currentStopTimeout = setTimeout(() => {
                    this.releaseVoice();
                }, (absoluteEndTime - audioContext.currentTime) * 1000 + 10);
            } else {
                this.releaseVoice();
            }
            return this;
        },
        stop() {
            const now = audioContext.currentTime;
            this.scheduleEnd(now);
        },
        releaseVoice() {
            audioBufferSource.disconnect();

            this.inUse = false;
            currentStopTimeout = undefined;
        }
    };

};

type PerxThingyVoice = ReturnType<typeof perxVoice>;

export class PerxThingy extends Synth<EventParamsBase, PerxThingyVoice> {
    voices: PerxThingyVoice[] = [];

    envelopeGen: ReturnType<typeof oneShotEnvelope>;

    panCorrParam = {
        displayName: "octave - pan correlation",
        exportable: true,
        type: ParamType.number,
        value: 0,
        min: -1,
        max: 1,
    } as NumberSynthParam;

    memoizedCluster = {
        octavesInterval: 0,
        volumeRolloff: 0,
        oscillatorsCount: 0,
        relativeOctaves: [] as number[],
        gains: [] as number[],
    }

    octaveToPan = (octave: number) => {
        const corr = this.panCorrParam.value;
        const refOct = 3;
        const octDiff = octave - refOct;
        const pan = octDiff * corr;
        if (pan < -1) return -1;
        if (pan > 1) return 1;
        return pan;
    }

    constructor(
        audioContext: AudioContext,
    ) {
        super(audioContext, perxVoice);
        this.output.gain.value = 0.1;

        this.transformTriggerParams = (params: EventParamsBase):PerxThingyNoteParams => {
            return {
                ...params,
                envelopeBuffer: this.envelopeGen.currentBuffer.value,
            };
        }

        let enableCalled = false;
        this.envelopeGen = oneShotEnvelope(this.audioContext);

        this.enable = async () => {
            if (enableCalled) return;
            enableCalled = true;

            const {
                attackParam,
                decayParam,
                attackCurveParam,
                decayCurveParam,
            } = this.envelopeGen;

            this.params.push(attackParam, decayParam, attackCurveParam, decayCurveParam);

            this.isReady = true;
        }

        this.disable = () => {
            this.isReady = false;
        }

    }
    params = [] as SynthParam[];
}
