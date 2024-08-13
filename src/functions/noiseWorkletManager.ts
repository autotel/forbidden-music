import workleturl from "./noiseWorklet.js?url";

type Pdescs = { name: string, defaultValue: number, minValue: number, maxValue: number, automationRate: "k-rate" | "a-rate" }[]

export async function noiseWorkletManager(
  context: BaseAudioContext
) {

  await context.audioWorklet.addModule(workleturl);
  const create = () => {
    const worklet = new AudioWorkletNode(context, "noise-generator");
    return {
      worklet,
    };
  }

  return {
    create, paramDescriptors: [] as Pdescs,
  }
}
