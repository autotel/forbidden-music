import { useDebounceFn } from "@vueuse/shared";
import { NumberSynthParam, ParamType } from "../types/SynthParam"

interface CTPP {
    displayName: string,
    min: number,
    max: number,
    value: number,
}
const changeTrigNumParam = ({
    displayName, min, max, value
}: CTPP, listener: () => void) => {
    return {
        _v: value,
        displayName,
        type: ParamType.number,
        min,
        max,
        set value(v: number) {
            this._v = v;
            listener();
        },
        get value() {
            return this._v;
        },
        exportable: true,
    } as NumberSynthParam
}

interface SimpleRef<T> {
    value: T,
}

export const oneShotEnvelope = (audioContext: AudioContext) => {
    let worker: undefined | Worker = undefined;
    let waitingResponseSince: false | number = 0;
    
    const paramChanged = () => {
        requestNewWave();
    };
    
    const curveExtremes = 10;
    const currentWave = { value: new Float32Array(0) } as SimpleRef<Float32Array>;
    const currentBuffer: SimpleRef<AudioBuffer> = { value: audioContext.createBuffer(1, 1, audioContext.sampleRate) };

    const attackParam = changeTrigNumParam({
        displayName: 'Attack',
        min: 0,
        max: 2,
        value: 0.01,
    }, paramChanged);

    const decayParam = changeTrigNumParam({
        displayName: 'Decay',
        min: 0,
        max: 2,
        value: 0.26,
    }, paramChanged);

    const attackCurveParam = changeTrigNumParam({
        displayName: 'Attack Curve',
        min: 1/curveExtremes,
        max: curveExtremes,
        value: 0.28,
    }, paramChanged);

    const decayCurveParam = changeTrigNumParam({
        displayName: 'Decay Curve',
        min: 1/curveExtremes,
        max: curveExtremes,
        value: 0.5,
    }, paramChanged);

    let waveReceiver = (wave: Float32Array) => { }
    let sendMeYourWave = (receiver: (wave: Float32Array) => void) => {
        waveReceiver = receiver;
        waveReceiver(currentWave.value as Float32Array);
    }

    const applyNewWave = (newWave: Float32Array) => {
        const newBuffer = audioContext.createBuffer(1, newWave.length, audioContext.sampleRate);
        const data = newBuffer.getChannelData(0);
        for (let i = 0; i < newWave.length; i++) {
            if (isNaN(newWave[i])) newWave[i] = 0;
            data[i] = newWave[i];
        }
        currentWave.value = newWave;
        currentBuffer.value = newBuffer;
        // waitingResponseSince ? console.log("calc took", Date.now() - waitingResponseSince, "ms") : null;
        waitingResponseSince = false;
        waveReceiver(newWave);
    }

    let afterWaveRequesTimeout: undefined | ReturnType<typeof setTimeout>;
    const requestNewWave = () => {
        if (waitingResponseSince) {
            const length = Date.now() - waitingResponseSince;
            if (length > 1000) {
                console.error(name, "worker timed out");
                waitingResponseSince = false;
            } else {
                console.log("waiting for worker to finish, will request wave again after finished");
                if(afterWaveRequesTimeout) clearTimeout(afterWaveRequesTimeout);
                afterWaveRequesTimeout = setTimeout(() => {
                    requestNewWave();
                }, 300);
                return;
            }
        }
        if (!worker) {
            console.error(name, "worker not loaded");
            return;
        }
        worker.postMessage({
            sampleRate: audioContext.sampleRate,
            attackTime: attackParam.value,
            decayTime: decayParam.value,
            attackCurve: attackCurveParam.value,
            decayCurve: decayCurveParam.value,
        });
        waitingResponseSince = Date.now();
    }

    worker = new Worker(
        new URL('./OneShotEnvelopeSampleGenerator.js', import.meta.url),
        { type: 'module' }
    );
    worker.onmessage = (e: MessageEvent<Float32Array>) => {
        console.log("got new wave");
        applyNewWave(e.data);
    }
    setTimeout(() => {
        paramChanged();
    }, 10);

    return {
        attackParam,
        decayParam,
        attackCurveParam,
        decayCurveParam,
        currentWave,
        currentBuffer,
        sendMeYourWave,
    }
}