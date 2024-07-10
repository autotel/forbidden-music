// @ts-check
/**
 * @param {number} sampleRate
 * @param {number} attackTime
 * @param {number} decayTime
 * @param {number} attackCurve
 * @param {number} decayCurve 
 * @returns {Float32Array}
 */
const generate = (
    sampleRate, attackTime, decayTime, attackCurve, decayCurve
) => {

    requireNotToBeNaN({
        sampleRate,
        attackTime,
        decayTime,
        attackCurve,
        decayCurve
    });


    const attackSamples = Math.round(attackTime * sampleRate) || 1;
    const decaySamples = Math.round(decayTime * sampleRate) || 1;
    const totalSamples = attackSamples + decaySamples;
    const result = new Float32Array(totalSamples);

    for (let i = 0; i < attackSamples; i++) {
        const t = i / attackSamples;
        const level = curveFunction(t, attackCurve);
        result[i] = (level);
    }
    for (let i = 0; i < decaySamples; i++) {
        const t = i / decaySamples;
        const level = curveFunction(t, decayCurve);
        result[i + attackSamples] = 1 - (level);
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
    if (t > 1) {
        return 1;
    }
    if (t < 0) {
        return 0;
    }
    return Math.pow(t, curve)
}
/**
 * @param {number} v
 */
const clampAudio = (v) => {
    return Math.min(1, Math.max(-1, v));
}

onmessage = ({
    data: {
        sampleRate,
        attackTime,
        decayTime,
        attackCurve,
        decayCurve
    }
}) => {
    const result = generate(
        sampleRate,
        attackTime,
        decayTime,
        attackCurve,
        decayCurve
    );
    // console.log('KickSampleGenWorker', result);
    postMessage(result);
}