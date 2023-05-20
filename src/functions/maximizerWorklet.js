
// @ts-ignore
class Maximizer extends AudioWorkletProcessor {
  slowerGain = 1;

  process(inputs, outputs, parameters) {
    let min = 0;
    let max = 0;

    let slowerGain = this.slowerGain;

    inputs.forEach((input, inputNo) => {
      input.forEach((channel, channelNo) => {
        let sampleCount = input[channelNo].length;
        for (let sampleNo = 0; sampleNo < sampleCount; sampleNo++) {
          const sample = channel[sampleNo];
          if (sample > max) max = sample;
          if (sample < min) min = sample;
          outputs[0][channelNo][sampleNo] = sample * slowerGain;
        };
      })
    });


    const range = max - min;
    // min makes it not amplify, only reduce.
    const gain = Math.min(1 / range, 1);
    if(gain < slowerGain){ 
      slowerGain = gain;
    }else{
      slowerGain = gain * 0.00001 + slowerGain * 0.99999;
    }
    this.slowerGain = slowerGain;
    return true
  }
  constructor(...p) {
    super(...p);
    // setInterval(()=>{
    //   console.log("gain",this.slowerGain);
    // },500);
  }
}

// @ts-ignore
registerProcessor('maximizer', Maximizer)