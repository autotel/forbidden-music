class Noise extends AudioWorkletProcessor {
    process(inputs: Float32Array[][], outputs: Float32Array[][]) {
        console.log("process");
        const output = outputs[0][0];
        for (let i = 0; i < output.length; i++) {
            const noiseVal = Math.random() * 2 - 1;
            // dual mono
            for (let channel = 1; channel < outputs[0].length; channel++) {
                outputs[0][channel][i] = noiseVal;
            }
        }
        return true;
    }
}

registerProcessor("noise-generator", Noise);