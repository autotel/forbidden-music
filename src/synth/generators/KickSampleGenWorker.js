// @ts-check
/**
 * @param {number} sampleRate 
 * @param {number} inherentSampleFrequency desired tone of the sound (not necessarily respected, depends on curve & decays)
 * @param {number} startOctave octave to bend up at the beggining
 * @param {number} vDecayTime volume decay time in seconds
 * @param {number} fDecayTime tone decay time in seconds
 * @param {number} vcurve volume decay curve
 * @param {number} fcurve tone decay curve
 * @param {boolean} aliasError whether to multiply the fq beyond aliasing frequency
 */
const generate = (
    sampleRate,
    inherentSampleFrequency,
    startOctave,
    vDecayTime,
    fDecayTime,
    vcurve,
    fcurve,
    aliasError
) => {

    // requireNotToBeNaN({
    //     sampleRate,
    //     inherentSampleFrequency,
    //     startOctave,
    //     vDecayTime,
    //     fDecayTime,
    //     vcurve,
    //     fcurve
    // });


    const decaySamples = Math.round(vDecayTime * sampleRate) || 1;
    const result = new Float32Array(decaySamples);
    let phase = 0;
    for (let i = 0; i < decaySamples; i++) {
        const t = i / decaySamples;
        const secs = i / sampleRate;
        const octaveAdd = (
            startOctave * curveFunction(secs / fDecayTime, fcurve)
        );
        let oct = 1 + octaveAdd;
        if (aliasError) oct *= 10;
        const frequency = inherentSampleFrequency * Math.pow(2, oct);
        phase += frequency / sampleRate;
        result[i] = Math.sin(Math.PI * 2 * phase) * curveFunction(t, vcurve);
        // requireNotToBeNaN({ oct, frequency, sampleRate, phase, result: result[i] });
    }
    return result;
}
/**
 * @param {Object} valDict
 */
const requireNotToBeNaN = (valDict) => {
    for (const key in valDict) {
        if (isNaN(valDict[key])) {
            throw new Error(`Value ${key} is NaN`);
        }
    }
}
/**
 * @param {number} t interpolation moment between zero and 1
 * @param {number} curve curve exp
 */
const curveFunction = (t, curve) => {
    return Math.max(0, 1 - Math.pow(t, curve));
}
/**
 * @param {number} v
 */
const clampAudio = (v) => {
    return Math.min(1, Math.max(-1, v));
}

onmessage = ({
    data: {
        inherentSampleFrequency,
        startOctave,
        vDecayTime,
        fDecayTime,
        vcurve,
        fcurve,
        sampleRate,
        aliasError,
    }
}) => {
    const result = generate(
        sampleRate,
        inherentSampleFrequency,
        startOctave,
        vDecayTime,
        fDecayTime,
        vcurve,
        fcurve,
        aliasError
    );
    // console.log('KickSampleGenWorker', result);
    postMessage(result);
}