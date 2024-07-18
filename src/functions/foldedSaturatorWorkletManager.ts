import workleturl from "./foldedSaturatorWorklet.js?url";
export async function foldedSaturatorWorkletManager(
  context: BaseAudioContext
) {
  const paramDescriptors = [
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

  await context.audioWorklet.addModule(workleturl);

  const create = () => {
    const worklet = new AudioWorkletNode(context, "foldedSaturator");

    let protoParams: { [key: string]: AudioNode } = {};

    for (let pDesc of paramDescriptors) {
      // @ts-ignore
      const param = worklet.parameters.get(pDesc.name);
      if (!param) {
        console.error(`Parameter ${pDesc.name} not found in worklet`);
      }
      protoParams[pDesc.name] = param;
    };
    // @ts-ignore
    const params: {
      preGain: AudioParam,
      postGain: AudioParam,
    } = protoParams;
    return {
      worklet,
      params,
    };
  }

  return {
    create, paramDescriptors,
  }
}
