
// @ts-ignore

const fold = (v) => {
  if(v<1 && v>-1){
    return v;
  }
  return (Math.abs(v) % 1) * Math.sign(v);
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
    let min = 0;
    let max = 0;

    let slowerGain = this.slowerGain;


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
  }
  constructor(...p) {
    super(...p);
  }
}

// @ts-ignore
registerProcessor('foldedSaturator', FoldedSaturator)