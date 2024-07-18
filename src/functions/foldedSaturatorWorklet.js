
// @ts-ignore

const fold = sample => {
  const off1 = sample + 1;
  const invert = -(
    (Math.floor(Math.abs(off1 / 2)) % 2) * 2 - 1
  );
  if (off1 > 1) {
    return invert * (2 * ((off1 / 2) % 1) - 1);
  } else if (off1 < 0) {
    return invert * (2 * -((off1 / 2) % 1) - 1);
  }
  return sample;
}
class FoldedSaturator extends AudioWorkletProcessor {

  static get parameterDescriptors() {
    return [
      {
        name: "preGain",
        defaultValue: 1,
        minValue: 0,
        maxValue: 10,
        automationRate: "k-rate", // k = per block; a = per sample
      },
      {
        name: "postGain",
        defaultValue: 1,
        minValue: 0,
        maxValue: 10,
        automationRate: "k-rate", // k = per block; a = per sample
      },
    ];
  }

  process(inputs, outputs, parameters) {
    const preGainParam = parameters["preGain"]
    const preGain = Math.pow(preGainParam[0], 12);

    const postGainParam = parameters["postGain"]
    const postGain = Math.pow(postGainParam[0], 12);

    inputs.forEach((input, inputNo) => {
      input.forEach((channel, channelNo) => {
        let sampleCount = input[channelNo].length;
        for (let sampleNo = 0; sampleNo < sampleCount; sampleNo++) {
          const sample = fold(
            channel[sampleNo] * preGain
          ) * postGain;
          outputs[0][channelNo][sampleNo] = sample;
        };
      })
    });
    return true;
  }
  constructor(...p) {
    super(...p);
  }
}

// @ts-ignore
registerProcessor('foldedSaturator', FoldedSaturator)