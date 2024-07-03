// @ts-check

// class SampleBySampleOperator {
//   /**
//    * @param {number} inSample
//    */
//   operation = (inSample) => inSample;
// }


// class LpBoxcar extends SampleBySampleOperator {
//   /** @type {number} */
//   k
//   /** 
//    * @param {number} k
//    */
//   constructor(k) {
//       super();
//       this.k = k;
//       let mem = 0;
//       /** 
//        * @param {number} x
//        * @returns {number}
//        */
//       this.operation = (x) => {
//           mem = this.k * x + (1 - this.k) * mem;
//           return mem;
//       }
//       this.reset = () => {
//           mem = 0;
//       }
//   }
// }

// @ts-ignore
class AudioEnvelope extends AudioWorkletProcessor {

  static get parameterDescriptors() {
    return [
      {
        name: "increaseRate",
        defaultValue: 0.001,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate", // k = per block; a = per sample
      },
      {
        name: "decreaseRate",
        defaultValue: 0.001,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate", // k = per block; a = per sample
      },
      {
        name: "level",
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


  process(inputs, outputs, parameters) {

    const increaseRateParam = parameters["increaseRate"]
    const increaseRate = increaseRateParam[0];

    const decreaseRateParam = parameters["decreaseRate"]
    const decreaseRate = decreaseRateParam[0];

    inputs.forEach((input, inputNo) => {
      const correlativeOutput = outputs[inputNo];
      input.forEach((channel, channelNo) => {
        // for a-rate:
        // const increaseRate = (increaseRateParam.length > 1 ? increaseRateParam[i] : increaseRateParam[0]);
        let sampleCount = input[channelNo].length;
        for (let sampleNo = 0; sampleNo < sampleCount; sampleNo++) {
          const sample = channel[sampleNo];
          const level = Math.abs(sample);
          if (level > this.measuredLevel) {
            const diff = level - this.measuredLevel;
            this.measuredLevel = this.measuredLevel + diff * increaseRate;
          } else {
            if (this.measuredLevel > 0) {
              const diff = this.measuredLevel - level;
              this.measuredLevel = this.measuredLevel - diff * decreaseRate;
            }
          }
          correlativeOutput[channelNo][sampleNo] = this.measuredLevel;
        }
      })
    });

    const levelParam = parameters["level"];
    levelParam[0] = this.measuredLevel;

    return true
  }
  constructor(...p) {
    super(...p);
  }
}

// @ts-ignore
registerProcessor('audioEnvelope', AudioEnvelope)