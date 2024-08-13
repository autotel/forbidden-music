// @ts-check
class AudioEnvelope extends AudioWorkletProcessor {

  process(inputs, outputs, parameters) {
    // @ts-ignore
    if (sampleRate === undefined) {
      console.warn("sampleRate is undefined, using best guess");
      // @ts-ignore
      sampleRate = 44100;
    }

    const output = outputs[0];
    const outputChannel = output[0];
    for (let i = 0; i < outputChannel.length; i++) {
      outputChannel[i] = Math.random() * 2 - 1;
    }

    return true
  }
  constructor(...p) {
    super(...p);
  }
}

//@ts-ignore
registerProcessor('noise-generator', AudioEnvelope)