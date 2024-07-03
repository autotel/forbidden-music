// @ts-check

class SampleBySampleOperator {
  /**
   * @param {number} inSample
   */
  operation = (inSample) => inSample;
}


class LpBoxcar extends SampleBySampleOperator {
  /** @type {number} */
  k
  /** 
   * @param {number} k
   */
  constructor(k) {
    super();
    this.k = k;
    let mem = 0;
    /** 
     * @param {number} x
     * @returns {number}
     */
    this.operation = (x) => {
      mem = this.k * x + (1 - this.k) * mem;
      return mem;
    }
    this.reset = () => {
      mem = 0;
    }
  }
}

// @ts-ignore
class AudioEnvelope extends AudioWorkletProcessor {

  static get parameterDescriptors() {
    return [
      {
        name: "increaseRate",
        defaultValue: 1,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate", // k = per block; a = per sample
      },
      {
        name: "decreaseRate",
        defaultValue: 0.45,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate", // k = per block; a = per sample
      },
      {
        name: "bias",
        defaultValue: 0,
        minValue: -1,
        maxValue: 1,
        automationRate: "k-rate", // k = per block; a = per sample
      },
      {
        name: "level",
        defaultValue: 1,
        minValue: -2,
        maxValue: 2,
        automationRate: "k-rate", // k = per block; a = per sample
      },
      {
        name: "outputLevel",
        // Prolly made-up prop.
        readOnly: true,
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
    ];
  }

  measuredLevel = 0;
  filtered = new LpBoxcar(0.1);


  process(inputs, outputs, parameters) {
    if (sampleRate === undefined) {
      console.warn("sampleRate is undefined, using best guess");
      sampleRate = 44100;
    }

    const increaseRateParam = parameters["increaseRate"]
    const increaseRate = Math.pow(increaseRateParam[0], 12);
    const oppossiteIncreaseRate = 1 - increaseRate;

    const decreaseRateParam = parameters["decreaseRate"]
    const decreaseRate = Math.pow(decreaseRateParam[0], 12);
    const oppossiteDecreaseRate = 1 - decreaseRate;

    const levelParam = parameters["level"]
    // TODO: calculate these when changed only?
    const outMult = levelParam[0];

    const biasParam = parameters["bias"]
    const bias = biasParam[0];

    let newMeasuredLevel = this.measuredLevel;
    let outputLevel = 0;

    inputs.forEach((input, inputNo) => {
      const correlativeOutput = outputs[inputNo];
      input.forEach((channel, channelNo) => {
        // for a-rate:
        // const increaseRate = (increaseRateParam.length > 1 ? increaseRateParam[i] : increaseRateParam[0]);
        let sampleCount = input[channelNo].length;
        for (let sampleNo = 0; sampleNo < sampleCount; sampleNo++) {
          const sample = channel[sampleNo];
          const level = Math.abs(sample);
          if (level > newMeasuredLevel) {
            newMeasuredLevel = (oppossiteIncreaseRate * newMeasuredLevel) + (increaseRate * level);
          } else {
            newMeasuredLevel = (oppossiteDecreaseRate * newMeasuredLevel) + (decreaseRate * level);
          }
          if (newMeasuredLevel < 0) {
            newMeasuredLevel = 0;
          } else if (newMeasuredLevel > 2) {
            newMeasuredLevel = 2;
          }
          outputLevel = newMeasuredLevel * outMult + bias;
          correlativeOutput[channelNo][sampleNo] = outputLevel;
        }
      })
    });
    if (newMeasuredLevel !== this.measuredLevel) {
      this.sendLevel();
    }
    this.measuredLevel = newMeasuredLevel;

    const outLevelParam = parameters["outputLevel"];
    outLevelParam[0] = outputLevel;

    return true
  }
  constructor(...p) {
    super(...p);
  }
  sendLevel = () => {
    this.port.postMessage(this.measuredLevel);
  }
}

//@ts-ignore
registerProcessor('audioEnvelope', AudioEnvelope)