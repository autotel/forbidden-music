import workletUrl from "./adsr.worklet.js?url";
export async function adsrWorkletManager(
  context: BaseAudioContext
) {
  const paramDescriptors = [
    { name: 'attack', defaultValue: 0.1, minValue: 0, maxValue: 60, automationRate: "k-rate" },
    { name: 'attackcurve', defaultValue: .5, minValue: 0, maxValue: 1, automationRate: "k-rate" },
    { name: 'decay', defaultValue: 0, minValue: 0, maxValue: 60, automationRate: "k-rate" },
    { name: 'sustain', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: "k-rate" },
    { name: 'release', defaultValue: 0, minValue: 0, maxValue: 60, automationRate: "k-rate" },
    { name: 'trigger', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: "a-rate" },
  ];
  console.log("loading ADSR worklet", workletUrl)
  await context.audioWorklet.addModule(workletUrl);
  console.log("worklet ready");
  const create = () => {
    const worklet = new AudioWorkletNode(context, "adsr-generator");

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
      attack: AudioParam,
      attackcurve: AudioParam,
      decay: AudioParam,
      sustain: AudioParam,
      release: AudioParam,
      trigger: AudioParam,
    } = protoParams;
    return {
      worklet,
      params,
      triggerAtTime(time: number, value: number) {
        this.params.trigger.setValueAtTime(value, time);
      },
      triggerStopAtTime(time: number) {
        this.triggerAtTime(time, 0);
      }
    };
  }

  return {
    create, paramDescriptors,
  }
}
